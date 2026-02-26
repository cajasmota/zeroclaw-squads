import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { SeedService } from './seed.service';
import { Tenant } from './tenant.schema';
import { User } from './user.schema';

const mockTenantId = new Types.ObjectId();
const mockUserId = new Types.ObjectId();

const mockUser = {
  _id: mockUserId,
  tenantId: mockTenantId,
  email: 'test@example.com',
  passwordHash: '',
  name: 'Test User',
  role: 'admin',
  status: 'active',
  toObject: () => ({ ...mockUser }),
};

const mockTenant = {
  _id: mockTenantId,
  name: 'Test Tenant',
  slug: 'default',
  status: 'active',
};

const tenantFindOne = jest.fn();
const userFindOne = jest.fn();
const userFind = jest.fn();
const userCreate = jest.fn();
const userFindOneAndUpdate = jest.fn();

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mockUser.passwordHash = passwordHash;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(Tenant.name),
          useValue: { findOne: tenantFindOne },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            findOne: userFindOne,
            find: userFind,
            create: userCreate,
            findOneAndUpdate: userFindOneAndUpdate,
          },
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('mock-token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
        {
          provide: SeedService,
          useValue: { seedDefaultTenantAndAdmin: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login()', () => {
    it('should return accessToken on valid credentials', async () => {
      tenantFindOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockTenant) }),
      });
      userFindOne.mockReturnValue({ exec: () => Promise.resolve(mockUser) });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      tenantFindOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockTenant) }),
      });
      userFindOne.mockReturnValue({ exec: () => Promise.resolve(mockUser) });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      tenantFindOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockTenant) }),
      });
      userFindOne.mockReturnValue({ exec: () => Promise.resolve(null) });

      await expect(
        service.login({ email: 'nouser@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should auto-seed and succeed when default tenant is missing on first call', async () => {
      let callCount = 0;
      tenantFindOne.mockImplementation(() => ({
        lean: () => ({
          exec: () => {
            callCount++;
            return Promise.resolve(callCount === 1 ? null : mockTenant);
          },
        }),
      }));
      userFindOne.mockReturnValue({ exec: () => Promise.resolve(mockUser) });

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.accessToken).toBe('mock-token');
    });
  });

  describe('createUser()', () => {
    it('should create user successfully', async () => {
      userFindOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(null) }),
      });
      userCreate.mockResolvedValue({
        ...mockUser,
        toObject: () => ({ email: 'new@test.com' }),
      });

      const result = await service.createUser(
        {
          userId: mockUserId.toString(),
          tenantId: mockTenantId.toString(),
          email: 'admin@test.com',
          role: 'admin',
        },
        { email: 'new@test.com', password: 'pass12345', name: 'New User' },
      );
      expect(result.email).toBe('new@test.com');
    });

    it('should throw ConflictException on duplicate email', async () => {
      userFindOne.mockReturnValue({
        lean: () => ({ exec: () => Promise.resolve(mockUser) }),
      });

      await expect(
        service.createUser(
          {
            userId: mockUserId.toString(),
            tenantId: mockTenantId.toString(),
            email: 'admin@test.com',
            role: 'admin',
          },
          { email: 'test@example.com', password: 'pass12345', name: 'Dup' },
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException for non-admin user', async () => {
      await expect(
        service.createUser(
          {
            userId: mockUserId.toString(),
            tenantId: mockTenantId.toString(),
            email: 'user@test.com',
            role: 'member',
          },
          { email: 'new@test.com', password: 'pass12345', name: 'New' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
