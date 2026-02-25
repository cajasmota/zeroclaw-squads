import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OllamaService } from './ollama.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaService', () => {
  let service: OllamaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OllamaService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:11434') } },
      ],
    }).compile();

    service = module.get<OllamaService>(OllamaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('isHealthy()', () => {
    it('should return true when Ollama responds', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: {} });
      expect(await service.isHealthy()).toBe(true);
    });

    it('should return false when Ollama is unreachable', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      expect(await service.isHealthy()).toBe(false);
    });
  });

  describe('getStatus()', () => {
    it('should return healthy true and models list', async () => {
      const models = [{ name: 'qwen2.5-coder:1.5b' }];
      mockedAxios.get.mockResolvedValueOnce({ data: { models } });
      const result = await service.getStatus();
      expect(result.healthy).toBe(true);
      expect(result.models).toEqual(models);
    });

    it('should return healthy false with empty models on error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      const result = await service.getStatus();
      expect(result.healthy).toBe(false);
      expect(result.models).toEqual([]);
    });
  });

  describe('pullModel()', () => {
    it('should call POST /api/pull with model name', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });
      await service.pullModel('qwen2.5-coder:1.5b');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/pull',
        { name: 'qwen2.5-coder:1.5b' },
        expect.objectContaining({ timeout: 300000 }),
      );
    });
  });

  describe('deleteModel()', () => {
    it('should call DELETE /api/delete with model name', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });
      await service.deleteModel('qwen2.5-coder:1.5b');
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        'http://localhost:11434/api/delete',
        expect.objectContaining({ data: { name: 'qwen2.5-coder:1.5b' } }),
      );
    });
  });

  describe('unloadModel()', () => {
    it('should call POST /api/generate with keep_alive: 0', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });
      await service.unloadModel('qwen2.5-coder:1.5b');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        { model: 'qwen2.5-coder:1.5b', keep_alive: 0 },
        expect.any(Object),
      );
    });
  });

  describe('loadModel()', () => {
    it('should call POST /api/generate with keep_alive: -1', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });
      await service.loadModel('qwen2.5-coder:1.5b');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        { model: 'qwen2.5-coder:1.5b', keep_alive: -1 },
        expect.any(Object),
      );
    });
  });
});
