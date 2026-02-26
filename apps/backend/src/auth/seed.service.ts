import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './tenant.schema';
import { User, UserDocument } from './user.schema';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaultTenantAndAdmin();
  }

  async seedDefaultTenantAndAdmin() {
    let tenant = await this.tenantModel
      .findOne({ slug: 'default' })
      .lean()
      .exec();
    if (!tenant) {
      const appName = this.configService.get<string>('APP_NAME', 'AES');
      const created = await this.tenantModel.create({
        name: appName,
        slug: 'default',
        status: 'active',
      });
      tenant = created.toObject() as any;
      this.logger.log(`Created default tenant: ${appName}`);
    }

    const email = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@aes.local',
    );
    const password = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'changeme123!',
    );
    const name = this.configService.get<string>(
      'ADMIN_NAME',
      'Administrator',
    );

    const passwordHash = await bcrypt.hash(password, 12);

    const adminExists = await this.userModel
      .findOne({ tenantId: tenant!._id, email })
      .lean()
      .exec();

    if (!adminExists) {
      await this.userModel.create({
        tenantId: tenant!._id,
        email,
        passwordHash,
        name,
        role: 'admin',
        status: 'active',
      });
      this.logger.log(`=== ADMIN SEEDED ===`);
      this.logger.log(`Email: ${email}`);
      this.logger.log(`===================`);
    } else {
      await this.userModel.updateOne(
        { tenantId: tenant!._id, email },
        { $set: { passwordHash, name, status: 'active' } },
      );
      this.logger.log(`Admin credentials synced from env: ${email}`);
    }
  }
}
