import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Types } from 'mongoose';
import { AgentInstance } from '../agent-instances/agent-instance.schema';
import { Transcript } from './transcript.schema';
import { RuntimeTraceArchiveService } from './runtime-trace-archive.service';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

const instanceId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const tenantId = new Types.ObjectId();

describe('RuntimeTraceArchiveService', () => {
  let service: RuntimeTraceArchiveService;
  const mockCreate = jest.fn().mockResolvedValue({});
  const mockFindById = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuntimeTraceArchiveService,
        { provide: getModelToken(Transcript.name), useValue: { create: mockCreate } },
        { provide: getModelToken(AgentInstance.name), useValue: { findById: mockFindById } },
      ],
    }).compile();

    service = module.get<RuntimeTraceArchiveService>(RuntimeTraceArchiveService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should archive trace entries to MongoDB and truncate file', async () => {
    const workspacePath = '/artifacts/proj/workspaces/inst';
    mockFindById.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve({ _id: instanceId, projectId, tenantId, workspacePath }) }) });
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      '{"id":"1","event_type":"tool_call"}\n{"id":"2","event_type":"llm_response"}\n',
    );
    mockFs.writeFileSync.mockImplementation(() => {});

    await service.archiveTrace(instanceId.toString(), 'run-001');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-001',
        entries: expect.arrayContaining([
          expect.objectContaining({ id: '1' }),
          expect.objectContaining({ id: '2' }),
        ]),
      }),
    );
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('runtime-trace.jsonl'),
      '',
    );
  });

  it('should skip archiving when trace file does not exist', async () => {
    const workspacePath = '/artifacts/proj/workspaces/inst';
    mockFindById.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve({ _id: instanceId, projectId, tenantId, workspacePath }) }) });
    mockFs.existsSync.mockReturnValue(false);

    await service.archiveTrace(instanceId.toString(), 'run-002');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should skip archiving when agent instance not found', async () => {
    mockFindById.mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

    await service.archiveTrace(instanceId.toString(), 'run-003');
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
