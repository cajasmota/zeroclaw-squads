import { Test, TestingModule } from '@nestjs/testing';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { GitWorkspaceService } from './git-workspace.service';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  exec: jest.fn(),
}));

describe('GitWorkspaceService', () => {
  let service: GitWorkspaceService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-test-'));
    fs.mkdirSync(path.join(tmpDir, '.git'), { recursive: true });

    const module: TestingModule = await Test.createTestingModule({
      providers: [GitWorkspaceService],
    }).compile();

    service = module.get<GitWorkspaceService>(GitWorkspaceService);

    // Mock exec to call callback immediately
    (child_process.exec as any).mockImplementation((_cmd: string, callback: Function) => {
      callback(null, '', '');
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('acquireLock() / releaseLock()', () => {
    it('should create and remove lock file', () => {
      service.acquireLock(tmpDir);
      expect(fs.existsSync(path.join(tmpDir, '.git', 'aes.lock'))).toBe(true);
      service.releaseLock(tmpDir);
      expect(fs.existsSync(path.join(tmpDir, '.git', 'aes.lock'))).toBe(false);
    });

    it('should throw when workspace is already locked', () => {
      service.acquireLock(tmpDir);
      expect(() => service.acquireLock(tmpDir)).toThrow('Git workspace locked');
      service.releaseLock(tmpDir);
    });
  });

  describe('createFeatureBranch()', () => {
    it('should run git checkout -b with storyId', async () => {
      const branch = await service.createFeatureBranch(tmpDir, 'story-123');
      expect(branch).toBe('feature/story-123');
      expect(child_process.exec).toHaveBeenCalledWith(
        expect.stringContaining('checkout -b "feature/story-123"'),
        expect.any(Function),
      );
    });
  });
});
