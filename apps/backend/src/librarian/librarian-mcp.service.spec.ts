import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LibrarianMcpService } from './librarian-mcp.service';

jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

describe('LibrarianMcpService', () => {
  let service: LibrarianMcpService;
  const mockConfig = {
    get: jest.fn().mockReturnValue('http://localhost:5001'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibrarianMcpService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<LibrarianMcpService>(LibrarianMcpService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should call find_logic and return result', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValueOnce({
      data: { matches: ['fn doSomething()'] },
    });
    const result = await service.findLogic('authentication logic');
    expect(result.tool).toBe('find_logic');
    expect(result.result).toContain('doSomething');
  });

  it('should return fallback message when parser engine is down', async () => {
    const axios = require('axios');
    axios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await service.findLogic('some query');
    expect(result.result).toContain('some query');
  });

  it('should route tool calls via handleToolCall', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValueOnce({ data: { answer: '42' } });
    const result = await service.handleToolCall('ask_question', {
      question: 'What is 42?',
    });
    expect(result.tool).toBe('ask_question');
  });

  it('should return unknown tool message for unknown tool name', async () => {
    const result = await service.handleToolCall('nonexistent_tool', {});
    expect(result.result).toContain('Unknown tool');
  });

  it('check_convention_compliance should call compliance endpoint', async () => {
    const axios = require('axios');
    axios.post.mockResolvedValueOnce({ data: { violations: [] } });
    const result = await service.checkConventionCompliance(
      '/src/app.ts',
      'const x = 1;',
    );
    expect(result.tool).toBe('check_convention_compliance');
  });
});
