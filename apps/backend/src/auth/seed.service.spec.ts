import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { SeedService } from './seed.service';
import { Tenant } from './tenant.schema';
import { User } from './user.schema';

const tenantFindOne = jest.fn();
const tenantCreate = jest.fn();
const userFindOne = jest.fn();
const userCreate = jest.fn();

describe('SeedService', () => {
  let service: SeedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: getModelToken(Tenant.name),
          useValue: { findOne: tenantFindOne, create: tenantCreate },
        },
        {
          provide: getModelToken(User.name),
          useValue: { findOne: userFindOne, create: userCreate },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: any) => {
              const vals: Record<string, any> = {
                APP_NAME: 'TestAES',
                ADMIN_EMAIL: 'admin@test.com',
                ADMIN_PASSWORD: 'testpass123!',
                ADMIN_NAME: 'Admin',
              };
              return vals[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should create tenant and admin when DB is empty', async () => {
    const mockTenant = {
      _id: 'tenant-id',
      toObject: () => ({ _id: 'tenant-id' }),
    };
    tenantFindOne.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(null) }),
    });
    tenantCreate.mockResolvedValue(mockTenant);
    userFindOne.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(null) }),
    });
    userCreate.mockResolvedValue({});

    await service.seedDefaultTenantAndAdmin();

    expect(tenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'default' }),
    );
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
    );
  });

  it('should skip seeding when tenant and admin already exist', async () => {
    const mockTenant = { _id: 'existing-tenant' };
    tenantFindOne.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve(mockTenant) }),
    });
    userFindOne.mockReturnValue({
      lean: () => ({ exec: () => Promise.resolve({ role: 'admin' }) }),
    });

    await service.seedDefaultTenantAndAdmin();

    expect(tenantCreate).not.toHaveBeenCalled();
    expect(userCreate).not.toHaveBeenCalled();
  });
});
