import { Test, TestingModule } from '@nestjs/testing';
import { GitHubAppService } from './github-app.service';
import { Aes256EncryptionService } from '../common/services/aes256-encryption.service';

// Mock ESM-only packages before they are loaded
jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@octokit/auth-app', () => ({
  createAppAuth: jest.fn().mockReturnValue(jest.fn().mockResolvedValue({ token: 'mock-token' })),
}));

describe('GitHubAppService', () => {
  let service: GitHubAppService;
  const mockEncryption = { decrypt: jest.fn().mockImplementation((v) => v) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubAppService,
        { provide: Aes256EncryptionService, useValue: mockEncryption },
      ],
    }).compile();

    service = module.get<GitHubAppService>(GitHubAppService);
  });

  it('should get installation token using app credentials', async () => {
    const project = {
      config: {
        githubApp: { appId: '123', privateKey: 'mock-key', installationId: '456' },
      },
    };
    const token = await service.getInstallationToken(project);
    expect(token).toBe('mock-token');
  });

  it('should throw when GitHub App credentials are missing', async () => {
    const project = { config: {} };
    await expect(service.getInstallationToken(project)).rejects.toThrow('GitHub App credentials not configured');
  });
});
