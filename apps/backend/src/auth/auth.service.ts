import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { JwtPayload, RequestUser } from '@aes/types';
import { Tenant, TenantDocument } from './tenant.schema';
import { User, UserDocument } from './user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    let tenantId: Types.ObjectId;

    if (dto.tenantId) {
      tenantId = new Types.ObjectId(dto.tenantId);
    } else {
      const defaultTenant = await this.tenantModel
        .findOne({ slug: 'default' })
        .lean()
        .exec();
      if (!defaultTenant) throw new UnauthorizedException('No tenant found');
      tenantId = defaultTenant._id;
    }

    const user = await this.userModel
      .findOne({ tenantId, email: dto.email, status: 'active' })
      .exec();

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user._id.toString(),
      tenantId: tenantId.toString(),
      email: user.email,
      role: user.role as 'admin' | 'member',
    };

    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async createUser(currentUser: RequestUser, dto: CreateUserDto) {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const tenantId = new Types.ObjectId(currentUser.tenantId);

    const existing = await this.userModel
      .findOne({ tenantId, email: dto.email })
      .lean()
      .exec();
    if (existing)
      throw new ConflictException('Email already exists in this tenant');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      tenantId,
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role ?? 'member',
    });

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  async findAllUsers(tenantId: Types.ObjectId) {
    return this.userModel
      .find({ tenantId })
      .select('-passwordHash')
      .lean()
      .exec();
  }

  async findUserById(tenantId: Types.ObjectId, id: string) {
    const user = await this.userModel
      .findOne({ tenantId, _id: new Types.ObjectId(id) })
      .select('-passwordHash')
      .lean()
      .exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async updateUser(tenantId: Types.ObjectId, id: string, dto: UpdateUserDto) {
    const user = await this.userModel
      .findOneAndUpdate(
        { tenantId, _id: new Types.ObjectId(id) },
        { $set: dto },
        { new: true },
      )
      .select('-passwordHash')
      .lean()
      .exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async deleteUser(tenantId: Types.ObjectId, id: string) {
    const user = await this.userModel
      .findOneAndUpdate(
        { tenantId, _id: new Types.ObjectId(id) },
        { $set: { status: 'inactive' } },
        { new: true },
      )
      .select('-passwordHash')
      .lean()
      .exec();
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return { message: 'User deactivated' };
  }
}
