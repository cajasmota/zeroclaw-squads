# Backend Agent Guide — apps/backend/

You are working on the **NestJS backend** (control plane) of the AES system.

## Your Role
The backend is the orchestration layer. It:
- Manages agent lifecycle (ZeroClaw process spawn/kill/signal)
- Routes Slack events to agents
- Handles GitHub webhooks
- Exposes REST API for the frontend
- Broadcasts real-time events via WebSocket

## Project Rules (also see root CLAUDE.md)
- Package manager: **pnpm**
- Framework: **NestJS** with `@nestjs/mongoose`, `@nestjs/jwt`, `@nestjs/event-emitter`
- **Every Mongoose query MUST include `tenantId`** — never query without it
- **Every sensitive field MUST be AES-256 encrypted** before writing to MongoDB
- **All routes require `JwtAuthGuard`** unless decorated `@Public()`
- **Every service must have a co-located `.spec.ts` unit test file**

## Folder Structure

```
src/
├── main.ts                         ← Bootstrap, global pipes, guards
├── app.module.ts                   ← Root module, global config
├── common/
│   ├── decorators/
│   │   ├── public.decorator.ts     ← @Public() — skip JWT guard
│   │   ├── admin-only.decorator.ts ← @AdminOnly() — require admin role
│   │   └── current-user.decorator.ts ← @CurrentUser() param decorator
│   ├── guards/
│   │   └── jwt-auth.guard.ts       ← Global JWT guard
│   ├── middleware/
│   │   └── tenant.middleware.ts    ← Attaches tenantId to all requests
│   ├── services/
│   │   └── aes256-encryption.service.ts ← Encrypt/decrypt sensitive strings
│   └── utils/
│       └── security.utils.ts       ← validatePath() filesystem boundary check
├── auth/                           ← Story 0000002
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   ├── tenant.schema.ts
│   ├── user.schema.ts
│   ├── seed.service.ts             ← Default tenant + admin seeding
│   ├── jwt.strategy.ts
│   └── auth.service.spec.ts
├── templates/                      ← Story 0000003
├── projects/                       ← Story 0000005
├── agent-instances/                ← Story 0000006
├── project-initializer/            ← Story 0000008
├── zeroclaw/                       ← Story 0000009 + 0000010
│   ├── zeroclaw.module.ts
│   ├── zeroclaw-process-manager.service.ts
│   ├── zeroclaw-config-generator.service.ts
│   ├── zeroclaw-gateway.service.ts
│   └── stream-aggregator.service.ts
├── github/                         ← Story 0000011
├── backlog/                        ← Story 0000012
├── librarian/                      ← Story 0000013
├── development/                    ← Story 0000014 + 0000025
├── websocket/                      ← Story 0000023
│   └── aes.gateway.ts
├── workflows/                      ← Story 0000017
├── analytics/                      ← Story 0000020
├── models/                         ← Story 0000021
└── settings/                       ← Story 0000026
```

## NestJS Module Template
```ts
// {feature}/{feature}.module.ts
@Module({
  imports: [MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }])],
  providers: [FeatureService],
  controllers: [FeatureController],
  exports: [FeatureService],
})
export class FeatureModule {}
```

## Mongoose Schema Template
```ts
// Always include tenantId. Always use timestamps.
@Schema({ timestamps: true })
export class Feature extends Document {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;
}
export const FeatureSchema = SchemaFactory.createForClass(Feature);
```

## Service Query Template
```ts
// ALWAYS include tenantId in every query
async findAll(tenantId: Types.ObjectId): Promise<Feature[]> {
  return this.featureModel.find({ tenantId }).exec();
}

async findById(tenantId: Types.ObjectId, id: string): Promise<Feature> {
  const doc = await this.featureModel.findOne({ tenantId, _id: id }).exec();
  if (!doc) throw new NotFoundException(`Feature ${id} not found`);
  return doc;
}
```

## Controller Template
```ts
@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.featureService.findAll(user.tenantId);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateFeatureDto) {
    return this.featureService.create(user.tenantId, dto);
  }
}
```

## Running Tests
```bash
# From squads-v2/ root:
pnpm --filter=backend test
pnpm --filter=backend test:cov
pnpm --filter=backend test:watch

# Run a single test file:
pnpm --filter=backend test -- --testPathPattern=auth.service
```

## Starting the Backend
```bash
pnpm --filter=backend start:dev   # development with hot reload
pnpm --filter=backend build        # production build
pnpm --filter=backend start:prod   # production start
```

## Key Environment Variables (read from root .env)
```
MONGODB_URI            ← MongoDB connection string
JWT_SECRET             ← JWT signing secret
JWT_EXPIRES_IN         ← Token expiry (e.g., 7d)
AES_ENCRYPTION_KEY     ← 32-byte hex for AES-256 encryption
ZEROCLAW_BINARY_PATH   ← Path to zeroclaw binary
ARTIFACTS_ROOT         ← Root directory for agent workspaces (/artifacts)
OLLAMA_ENDPOINT        ← Local Ollama URL
APP_NAME               ← Application name for branding
ADMIN_EMAIL            ← Default admin user email (seeded on first start)
ADMIN_PASSWORD         ← Default admin user password (seeded on first start)
```
