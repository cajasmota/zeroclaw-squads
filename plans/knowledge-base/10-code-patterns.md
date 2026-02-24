# AES Knowledge Base — Reusable Code Patterns

> This file is updated by implementing agents when they identify patterns used in multiple places.
> Add patterns here immediately after first implementation. Reference from AGENTS.md files.

---

## Backend (NestJS) Patterns

### Pattern: Standard NestJS Feature Module
**When to use**: Every new backend feature (projects, agents, templates, etc.)
**CLI**: `npx nest generate module {name} && npx nest generate service {name} && npx nest generate controller {name}`

```ts
// {feature}/{feature}.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureService } from './{feature}.service';
import { FeatureController } from './{feature}.controller';
import { Feature, FeatureSchema } from './{feature}.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Feature.name, schema: FeatureSchema }])],
  providers: [FeatureService],
  controllers: [FeatureController],
  exports: [FeatureService],
})
export class FeatureModule {}
```

---

### Pattern: Mongoose Schema with Tenant Isolation
**When to use**: Every MongoDB collection that belongs to a tenant

```ts
// {feature}/{feature}.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Feature extends Document {
  @Prop({ type: SchemaTypes.ObjectId, required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;
}

export const FeatureSchema = SchemaFactory.createForClass(Feature);
```

---

### Pattern: Tenant-Scoped CRUD Service
**When to use**: Any service reading/writing tenant-owned data

```ts
// {feature}/{feature}.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feature } from './{feature}.schema';
import { CreateFeatureDto } from './dto/create-{feature}.dto';

@Injectable()
export class FeatureService {
  constructor(@InjectModel(Feature.name) private readonly featureModel: Model<Feature>) {}

  async findAll(tenantId: Types.ObjectId): Promise<Feature[]> {
    return this.featureModel.find({ tenantId }).exec();
  }

  async findById(tenantId: Types.ObjectId, id: string): Promise<Feature> {
    const doc = await this.featureModel.findOne({ tenantId, _id: id }).exec();
    if (!doc) throw new NotFoundException(`Feature ${id} not found`);
    return doc;
  }

  async create(tenantId: Types.ObjectId, dto: CreateFeatureDto): Promise<Feature> {
    return this.featureModel.create({ ...dto, tenantId });
  }

  async update(tenantId: Types.ObjectId, id: string, dto: Partial<CreateFeatureDto>): Promise<Feature> {
    const doc = await this.featureModel
      .findOneAndUpdate({ tenantId, _id: id }, dto, { new: true })
      .exec();
    if (!doc) throw new NotFoundException(`Feature ${id} not found`);
    return doc;
  }

  async remove(tenantId: Types.ObjectId, id: string): Promise<void> {
    const result = await this.featureModel.deleteOne({ tenantId, _id: id }).exec();
    if (result.deletedCount === 0) throw new NotFoundException(`Feature ${id} not found`);
  }
}
```

---

### Pattern: REST Controller with JWT Guard
**When to use**: Every protected REST endpoint

```ts
// {feature}/{feature}.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { FeatureService } from './{feature}.service';
import { CreateFeatureDto } from './dto/create-{feature}.dto';

@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.featureService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.featureService.findById(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateFeatureDto) {
    return this.featureService.create(user.tenantId, dto);
  }

  @Put(':id')
  update(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: CreateFeatureDto) {
    return this.featureService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.featureService.remove(user.tenantId, id);
  }
}
```

---

### Pattern: Validated DTO with class-validator
**When to use**: All request body DTOs

```ts
// dto/create-{feature}.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, MinLength } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
```

---

### Pattern: NestJS Unit Test with Mocked Model
**When to use**: Every service `.spec.ts` file

```ts
// {feature}/{feature}.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FeatureService } from './{feature}.service';
import { Feature } from './{feature}.schema';

const mockModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  deleteOne: jest.fn(),
};

describe('FeatureService', () => {
  let service: FeatureService;
  const tenantId = new Types.ObjectId();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: getModelToken(Feature.name), useValue: mockModel },
      ],
    }).compile();
    service = module.get<FeatureService>(FeatureService);
    jest.clearAllMocks();
  });

  it('should find all features for tenant', async () => {
    const mockDocs = [{ _id: new Types.ObjectId(), tenantId, name: 'test' }];
    mockModel.find.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDocs) });
    const result = await service.findAll(tenantId);
    expect(mockModel.find).toHaveBeenCalledWith({ tenantId });
    expect(result).toEqual(mockDocs);
  });

  it('should throw NotFoundException when feature not found', async () => {
    mockModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(service.findById(tenantId, 'nonexistent-id')).rejects.toThrow(NotFoundException);
  });
});
```

---

### Pattern: AES-256 Encrypted Field
**When to use**: Any sensitive field (API keys, tokens, passwords) stored in MongoDB

```ts
// In service, before saving:
const encrypted = this.encryptionService.encrypt(rawApiKey);
await this.model.create({ encryptedApiKey: encrypted, tenantId });

// When reading back for use (never return raw to API):
const doc = await this.model.findOne({ tenantId, _id: id }).exec();
const rawKey = this.encryptionService.decrypt(doc.encryptedApiKey);
// Use rawKey internally, never expose it in DTO responses
```

---

### Pattern: Cross-Module Event (no circular imports)
**When to use**: When module A needs to trigger an action in module B without importing it

```ts
// Emitter (e.g., ProjectsService):
import { EventEmitter2 } from '@nestjs/event-emitter';

constructor(private eventEmitter: EventEmitter2) {}

async create(tenantId, dto) {
  const project = await this.projectModel.create({ ...dto, tenantId });
  this.eventEmitter.emit('project.created', { projectId: project._id, tenantId });
  return project;
}

// Listener (e.g., ProjectInitializerService):
import { OnEvent } from '@nestjs/event-emitter';

@OnEvent('project.created')
async handleProjectCreated(payload: { projectId: Types.ObjectId; tenantId: Types.ObjectId }) {
  // initialize project resources
}
```

---

## Frontend (Next.js) Patterns

### Pattern: Next.js API Proxy Route
**When to use**: Every backend resource needs a corresponding `/api/` proxy route

```ts
// app/api/{resource}/[[...slug]]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL!;

async function proxyToBackend(req: NextRequest, path: string) {
  const cookieStore = cookies();
  const token = cookieStore.get('accessToken')?.value;

  const backendRes = await fetch(`${BACKEND_URL}/${path}`, {
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: req.method !== 'GET' ? await req.text() : undefined,
  });

  const data = await backendRes.json().catch(() => null);
  return NextResponse.json(data, { status: backendRes.status });
}

export async function GET(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.join('/') ?? '';
  return proxyToBackend(req, `{resource}${slug ? `/${slug}` : ''}`);
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '{resource}');
}

export async function PUT(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.join('/') ?? '';
  return proxyToBackend(req, `{resource}/${slug}`);
}

export async function DELETE(req: NextRequest, { params }: { params: { slug?: string[] } }) {
  const slug = params.slug?.join('/') ?? '';
  return proxyToBackend(req, `{resource}/${slug}`);
}
```

---

### Pattern: React Query Data Fetching (Client Component)
**When to use**: Any client component that fetches server data

```ts
// components/{feature}/{feature}-list.tsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api/client';

export function FeatureList() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['features'],
    queryFn: () => apiGet<Feature[]>('/features'),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateFeatureDto) => apiPost('/features', dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['features'] }),
  });

  if (isLoading) return <FeatureListSkeleton />;
  if (error) return <ErrorMessage error={error} />;
  return <div>{data?.map(f => <FeatureCard key={f._id} feature={f} />)}</div>;
}
```

---

### Pattern: Protected Server Component Page
**When to use**: Every page under `app/(authenticated)/`

```tsx
// app/(authenticated)/{feature}/page.tsx
import { Metadata } from 'next';
import { FeatureList } from '@/components/{feature}/{feature}-list';

export const metadata: Metadata = {
  title: `Feature | ${process.env.NEXT_PUBLIC_APP_NAME}`,
};

export default function FeaturePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Feature</h1>
      <FeatureList />
    </div>
  );
}
```

---

### Pattern: React Hook Form + Zod Form
**When to use**: Any form that submits data to the backend

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

type FormValues = z.infer<typeof schema>;

export function FeatureForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  );
}
```

---

### Pattern: API Client Base (lib/api/client.ts)
**When to use**: Foundation for all frontend API calls — implement once in story 0000024

```ts
// lib/api/client.ts
export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API error ${status}`);
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body);
  }
  return res.json();
}

export const apiGet  = <T>(path: string) => apiFetch<T>(path);
export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiPut  = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) =>
  apiFetch<T>(path, { method: 'DELETE' });
```

---

## References

- Backend AGENTS.md: `apps/backend/AGENTS.md`
- Frontend AGENTS.md: `apps/frontend/AGENTS.md`
- Types AGENTS.md: `packages/types/AGENTS.md`
- PRD.md: root `PRD.md`
