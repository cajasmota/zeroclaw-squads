import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { AgentInstance } from '../agent-instances/agent-instance.schema';
import { UsageEvent } from './usage-event.schema';
import { UsageMonitorService } from './usage-monitor.service';

// Mock chokidar to prevent real file watching
jest.mock('chokidar', () => ({
  watch: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    close: jest.fn(),
  }),
}));

describe('UsageMonitorService', () => {
  let service: UsageMonitorService;
  const mockCreate = jest.fn().mockResolvedValue({});
  const mockFindOne = jest
    .fn()
    .mockReturnValue({ lean: () => ({ exec: () => Promise.resolve(null) }) });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageMonitorService,
        {
          provide: getModelToken(UsageEvent.name),
          useValue: { create: mockCreate },
        },
        {
          provide: getModelToken(AgentInstance.name),
          useValue: { findOne: mockFindOne },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('/artifacts') },
        },
      ],
    }).compile();

    service = module.get<UsageMonitorService>(UsageMonitorService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should start watching on bootstrap', () => {
    const chokidar = require('chokidar');
    service.onApplicationBootstrap();
    expect(chokidar.watch).toHaveBeenCalledWith(
      expect.stringContaining('costs.jsonl'),
      expect.any(Object),
    );
  });

  it('should close watcher on shutdown', () => {
    service.onApplicationBootstrap();
    service.onApplicationShutdown();
    const chokidar = require('chokidar');
    const watcher = chokidar.watch.mock.results[0]?.value;
    expect(watcher?.close).toHaveBeenCalled();
  });
});
