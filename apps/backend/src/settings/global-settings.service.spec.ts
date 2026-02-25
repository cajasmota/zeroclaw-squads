import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';
import { GlobalSettings } from './global-settings.schema';
import { GlobalSettingsService } from './global-settings.service';

const mockEncryption = {
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace('enc:', '')),
};

const tenantId = new Types.ObjectId();

function makeSettings(overrides: Partial<any> = {}) {
  return {
    tenantId,
    appName: 'AES',
    defaultOllamaModel: 'qwen2.5-coder:1.5b',
    ollamaEndpoint: 'http://localhost:11434',
    globalInviteUsers: [],
    providers: { openai: true, anthropic: true, google: false, ollama: true },
    llmKeys: {
      openai: 'enc:global-openai',
      anthropic: 'enc:global-anthropic',
      google: 'enc:global-google',
    },
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

describe('GlobalSettingsService', () => {
  let service: GlobalSettingsService;
  let settingsModel: any;

  beforeEach(async () => {
    settingsModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalSettingsService,
        {
          provide: getModelToken(GlobalSettings.name),
          useValue: settingsModel,
        },
        { provide: Aes256EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<GlobalSettingsService>(GlobalSettingsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('get()', () => {
    it('should return existing settings', async () => {
      const doc = makeSettings();
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const result = await service.get(tenantId);
      expect(result).toBe(doc);
    });

    it('should create settings if none exist', async () => {
      const doc = makeSettings();
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(null),
      });
      settingsModel.create.mockResolvedValue(doc);
      const result = await service.get(tenantId);
      expect(settingsModel.create).toHaveBeenCalledWith({ tenantId });
      expect(result).toBe(doc);
    });
  });

  describe('getForDisplay()', () => {
    it('should mask sensitive llmKeys fields', async () => {
      const doc = makeSettings();
      doc.toObject = () => ({
        llmKeys: { openai: 'enc:key', anthropic: 'enc:key2', google: '' },
      });
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const result = await service.getForDisplay(tenantId);
      expect(result.llmKeys.openai).toBe('[encrypted]');
      expect(result.llmKeys.anthropic).toBe('[encrypted]');
      expect(result.llmKeys.google).toBe('');
    });
  });

  describe('update()', () => {
    it('should encrypt llmKeys before saving', async () => {
      const doc = makeSettings();
      settingsModel.findOneAndUpdate.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      await service.update(tenantId, {
        llmKeys: { openai: 'raw-key', anthropic: '', google: '' },
      });
      expect(mockEncryption.encrypt).toHaveBeenCalledWith('raw-key');
    });

    it('should not re-encrypt already masked keys', async () => {
      const doc = makeSettings();
      settingsModel.findOneAndUpdate.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      await service.update(tenantId, {
        llmKeys: { openai: '[encrypted]', anthropic: '', google: '' },
      });
      expect(mockEncryption.encrypt).not.toHaveBeenCalled();
    });
  });

  describe('resolveLlmKeys()', () => {
    it('should use project key over global key', async () => {
      const doc = makeSettings();
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const project = { config: { llmKeys: { openai: 'enc:project-openai' } } };
      const result = await service.resolveLlmKeys(tenantId, project);
      expect(result.openai).toBe('project-openai');
    });

    it('should fall back to global key when project key is empty', async () => {
      const doc = makeSettings();
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const project = { config: { llmKeys: { openai: '' } } };
      const result = await service.resolveLlmKeys(tenantId, project);
      expect(result.openai).toBe('global-openai');
    });

    it('should not return key for disabled provider', async () => {
      const doc = makeSettings();
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const project = { config: {} };
      const result = await service.resolveLlmKeys(tenantId, project);
      // google is disabled in settings
      expect(result.google).toBeUndefined();
    });

    it('should include ollamaEndpoint', async () => {
      const doc = makeSettings();
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const result = await service.resolveLlmKeys(tenantId, null);
      expect(result.ollamaEndpoint).toBe('http://localhost:11434');
    });

    it('should return only enabled providers', async () => {
      const doc = makeSettings({
        providers: {
          openai: false,
          anthropic: false,
          google: false,
          ollama: true,
        },
      });
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const result = await service.resolveLlmKeys(tenantId, null);
      expect(result.openai).toBeUndefined();
      expect(result.anthropic).toBeUndefined();
      expect(result.google).toBeUndefined();
    });
  });

  describe('resolveInviteUsers()', () => {
    it('should use project invite users if set', async () => {
      const doc = makeSettings({ globalInviteUsers: ['U_GLOBAL'] });
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const project = { config: { inviteUsers: ['U_PROJECT'] } };
      const result = await service.resolveInviteUsers(tenantId, project);
      expect(result).toEqual(['U_PROJECT']);
    });

    it('should fall back to global invite users', async () => {
      const doc = makeSettings({ globalInviteUsers: ['U_GLOBAL'] });
      settingsModel.findOne.mockReturnValue({
        exec: () => Promise.resolve(doc),
      });
      const project = { config: {} };
      const result = await service.resolveInviteUsers(tenantId, project);
      expect(result).toEqual(['U_GLOBAL']);
    });
  });
});
