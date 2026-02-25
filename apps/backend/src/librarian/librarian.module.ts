import { Module } from '@nestjs/common';
import { LibrarianController } from './librarian.controller';
import { LibrarianIndexerService } from './librarian-indexer.service';
import { LibrarianMcpService } from './librarian-mcp.service';

@Module({
  providers: [LibrarianIndexerService, LibrarianMcpService],
  controllers: [LibrarianController],
  exports: [LibrarianMcpService, LibrarianIndexerService],
})
export class LibrarianModule {}
