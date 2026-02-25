import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LibrarianIndexerService {
  private readonly logger = new Logger(LibrarianIndexerService.name);
  private readonly indexingStatus = new Map<
    string,
    'idle' | 'indexing' | 'done' | 'error'
  >();

  private get parserUrl(): string {
    return this.config.get<string>(
      'LIBRARIAN_PARSER_URL',
      'http://localhost:5001',
    );
  }

  private get graphUrl(): string {
    return this.config.get<string>(
      'LIBRARIAN_GRAPH_URL',
      'http://localhost:5002',
    );
  }

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  getStatus(projectId: string): { status: string } {
    return { status: this.indexingStatus.get(projectId) ?? 'idle' };
  }

  @OnEvent('librarian.reindex')
  async handleReindex(payload: {
    repoUrl: string;
    projectId?: string;
  }): Promise<void> {
    if (payload.projectId) {
      await this.triggerPostMergeReindex(payload.projectId);
    }
  }

  async triggerIngestion(projectId: string): Promise<void> {
    this.indexingStatus.set(projectId, 'indexing');
    this.logger.log(`Starting Librarian ingestion for project ${projectId}`);
    try {
      const artifactsRoot = this.config.get<string>(
        'ARTIFACTS_ROOT',
        '/artifacts',
      );
      const librarianPath = path.join(artifactsRoot, projectId, 'librarian');

      // Call parser engine to index source files
      await this.callParserEngine(librarianPath);
      // Build call graph
      await this.callGraphEngine(librarianPath);
      // Synthesize standards
      await this.synthesizeStandards(projectId, librarianPath);

      this.indexingStatus.set(projectId, 'done');
      this.eventEmitter.emit('librarian.indexed', { projectId });
      this.logger.log(`Librarian ingestion complete for project ${projectId}`);
    } catch (e) {
      this.indexingStatus.set(projectId, 'error');
      this.logger.error(`Librarian ingestion failed: ${e.message}`);
    }
  }

  async triggerPostMergeReindex(projectId: string): Promise<void> {
    this.logger.log(`Post-merge reindex for project ${projectId}`);
    await this.triggerIngestion(projectId);
  }

  private async callParserEngine(librarianPath: string): Promise<void> {
    try {
      await axios.post(
        `${this.parserUrl}/parse`,
        { path: librarianPath },
        { timeout: 30000 },
      );
    } catch {
      this.logger.warn('Parser engine unavailable, skipping parse step');
    }
  }

  private async callGraphEngine(librarianPath: string): Promise<void> {
    try {
      await axios.post(
        `${this.graphUrl}/build-graph`,
        { path: librarianPath },
        { timeout: 30000 },
      );
    } catch {
      this.logger.warn('Graph engine unavailable, skipping graph build step');
    }
  }

  private async synthesizeStandards(
    projectId: string,
    librarianPath: string,
  ): Promise<void> {
    this.logger.log(
      `Synthesizing standards for project ${projectId} at ${librarianPath}`,
    );
    try {
      // Query parser engine for type definitions and patterns
      let typePatterns = '';
      let graphSummary = '';

      try {
        const parserRes = await axios.get(`${this.parserUrl}/patterns`, {
          timeout: 10000,
        });
        if (parserRes.data?.patterns) {
          typePatterns = Object.entries(parserRes.data.patterns)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n');
        }
      } catch {
        this.logger.warn('Parser engine unavailable for standards synthesis');
      }

      try {
        const graphRes = await axios.get(
          `${this.graphUrl}/summary?projectId=${projectId}`,
          { timeout: 10000 },
        );
        if (graphRes.data?.summary) {
          graphSummary = graphRes.data.summary;
        }
      } catch {
        this.logger.warn('Graph engine unavailable for standards synthesis');
      }

      const aesDir = path.join(librarianPath, '.aes');
      fs.mkdirSync(aesDir, { recursive: true });

      const standardsContent = `# AES Code Standards
Generated: ${new Date().toISOString()}
Project: ${projectId}

## Conventions

### File Organization
- Backend: NestJS modules in \`apps/backend/src/{feature}/\`
- Frontend: Next.js App Router pages in \`apps/frontend/app/(authenticated)/\`
- Shared types: \`packages/types/\`

### Database
- All Mongoose queries MUST include \`tenantId\` filter
- Sensitive fields (API keys, tokens) MUST use AES-256 encryption
- Passwords MUST use bcrypt (min 12 rounds)

### API
- All routes require \`JwtAuthGuard\` unless explicitly \`@Public()\`
- Every service method must have a unit test

### Patterns Detected
${typePatterns || 'No patterns detected yet — run ingestion to populate.'}

### Call Graph Summary
${graphSummary || 'No graph data yet — run ingestion to populate.'}
`;

      fs.writeFileSync(path.join(aesDir, 'standards.md'), standardsContent, 'utf8');
      this.logger.log(`Standards written to ${path.join(aesDir, 'standards.md')}`);
    } catch (e) {
      this.logger.error(`Failed to synthesize standards: ${e.message}`);
    }
  }
}
