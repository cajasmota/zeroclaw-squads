import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectDocument } from './project.schema';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly encryption: Aes256EncryptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private encryptConfig(config: CreateProjectDto['config']): any {
    if (!config) return {};
    const enc = { ...config };
    if (enc.slackToken)
      enc.slackToken = this.encryption.encrypt(enc.slackToken);
    if (enc.githubApp?.privateKey) {
      enc.githubApp = {
        ...enc.githubApp,
        privateKey: this.encryption.encrypt(enc.githubApp.privateKey),
      };
    }
    if (enc.githubApp?.webhookSecret) {
      enc.githubApp = {
        ...enc.githubApp,
        webhookSecret: this.encryption.encrypt(enc.githubApp.webhookSecret),
      };
    }
    if (enc.llmKeys?.openai)
      enc.llmKeys = {
        ...enc.llmKeys,
        openai: this.encryption.encrypt(enc.llmKeys.openai),
      };
    if (enc.llmKeys?.anthropic)
      enc.llmKeys = {
        ...enc.llmKeys,
        anthropic: this.encryption.encrypt(enc.llmKeys.anthropic),
      };
    if (enc.llmKeys?.google)
      enc.llmKeys = {
        ...enc.llmKeys,
        google: this.encryption.encrypt(enc.llmKeys.google),
      };
    return enc;
  }

  private sanitizeProject(project: any): any {
    if (!project) return project;
    const p = { ...project };
    if (p.config) {
      p.config = { ...p.config };
      if (p.config.slackToken) p.config.slackToken = '[encrypted]';
      if (p.config.githubApp?.privateKey)
        p.config.githubApp = {
          ...p.config.githubApp,
          privateKey: '[encrypted]',
        };
      if (p.config.githubApp?.webhookSecret)
        p.config.githubApp = {
          ...p.config.githubApp,
          webhookSecret: '[encrypted]',
        };
      if (p.config.llmKeys?.openai)
        p.config.llmKeys = { ...p.config.llmKeys, openai: '[encrypted]' };
      if (p.config.llmKeys?.anthropic)
        p.config.llmKeys = { ...p.config.llmKeys, anthropic: '[encrypted]' };
      if (p.config.llmKeys?.google)
        p.config.llmKeys = { ...p.config.llmKeys, google: '[encrypted]' };
    }
    return p;
  }

  async findAll(tenantId: Types.ObjectId) {
    const projects = await this.projectModel.find({ tenantId }).lean().exec();
    return projects.map((p) => this.sanitizeProject(p));
  }

  async findById(tenantId: Types.ObjectId, id: string) {
    const project = await this.projectModel
      .findOne({ tenantId, _id: new Types.ObjectId(id) })
      .populate(
        'roles.librarian roles.architect roles.pm roles.developer roles.reviewer roles.optional',
      )
      .lean()
      .exec();
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return this.sanitizeProject(project);
  }

  async create(tenantId: Types.ObjectId, dto: CreateProjectDto) {
    const baseSlug = slugify(dto.name);
    let slug = baseSlug;
    let counter = 1;
    while (await this.projectModel.findOne({ tenantId, slug }).lean().exec()) {
      slug = `${baseSlug}-${counter++}`;
    }

    const encryptedConfig = this.encryptConfig(dto.config);
    const project = await this.projectModel.create({
      tenantId,
      name: dto.name,
      slug,
      brandColor: dto.brandColor ?? '#004176',
      config: encryptedConfig,
      roles: {
        librarian: null,
        architect: null,
        pm: null,
        developer: [],
        reviewer: [],
        optional: [],
      },
    });

    this.eventEmitter.emit('project.created', {
      projectId: project._id.toString(),
      tenantId: tenantId.toString(),
    });
    return this.sanitizeProject(project.toObject());
  }

  async update(tenantId: Types.ObjectId, id: string, dto: UpdateProjectDto) {
    const update: Record<string, any> = {};
    if (dto.name) update.name = dto.name;
    if (dto.brandColor) update.brandColor = dto.brandColor;
    if (dto.config) update.config = this.encryptConfig(dto.config);

    const project = await this.projectModel
      .findOneAndUpdate(
        { tenantId, _id: new Types.ObjectId(id) },
        { $set: update },
        { new: true },
      )
      .lean()
      .exec();
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return this.sanitizeProject(project);
  }

  async archive(tenantId: Types.ObjectId, id: string) {
    const project = await this.projectModel
      .findOneAndUpdate(
        { tenantId, _id: new Types.ObjectId(id) },
        { $set: { status: 'archived' } },
        { new: true },
      )
      .lean()
      .exec();
    if (!project) throw new NotFoundException(`Project ${id} not found`);
    return { message: 'Project archived' };
  }
}
