import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class AesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AesGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:project')
  handleJoinProject(client: Socket, projectId: string) {
    client.join(`project:${projectId}`);
    return { joined: `project:${projectId}` };
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(client: Socket, projectId: string) {
    client.leave(`project:${projectId}`);
  }

  emitToProject(projectId: string, event: string, data: any) {
    this.server.to(`project:${projectId}`).emit(event, data);
  }

  emitAgentLog(agentInstanceId: string, projectId: string, line: string, type: 'stdout' | 'stderr', runId?: string) {
    this.emitToProject(projectId, 'agent:log', {
      agentInstanceId,
      line,
      type,
      runId,
      timestamp: new Date().toISOString(),
    });
  }

  emitStoryStatus(projectId: string, storyId: string, status: string, workflowNodeStatus?: string) {
    this.emitToProject(projectId, 'story:status', { storyId, status, workflowNodeStatus });
  }

  emitAgentStatus(projectId: string, agentInstanceId: string, status: string) {
    this.emitToProject(projectId, 'agent:status', { agentInstanceId, status });
  }

  emitWorkflowNode(projectId: string, runId: string, nodeId: string, status: string) {
    this.emitToProject(projectId, 'workflow:node', { runId, nodeId, status });
  }

  emitApprovalNeeded(projectId: string, runId: string, nodeId: string, description: string) {
    this.emitToProject(projectId, 'approval:needed', { runId, nodeId, description });
  }
}
