import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LibrarianIndexerService } from './librarian-indexer.service';
import { LibrarianMcpService } from './librarian-mcp.service';

@Controller('projects/:projectId/librarian')
@UseGuards(JwtAuthGuard)
export class LibrarianController {
  constructor(
    private readonly indexer: LibrarianIndexerService,
    private readonly mcp: LibrarianMcpService,
  ) {}

  @Get('status')
  getStatus(@Param('projectId') projectId: string) {
    return this.indexer.getStatus(projectId);
  }

  @Post('ingest')
  async triggerIngest(@Param('projectId') projectId: string) {
    await this.indexer.triggerIngestion(projectId);
    return { message: 'Ingestion started' };
  }

  @Post('tools/:toolName')
  async callTool(@Param('toolName') toolName: string, @Body() params: Record<string, any>) {
    return this.mcp.handleToolCall(toolName, params);
  }
}
