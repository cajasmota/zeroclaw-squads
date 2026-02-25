import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type WorkflowTemplateDocument = WorkflowTemplate & Document;

export interface WorkflowNode {
  id: string;
  type: string;
  agentRole: string;
  requiresHumanApproval: boolean;
  description: string;
  nextNodeId?: string;
  onSuccessNodeId?: string;
  onFailNodeId?: string;
  kanbanStatus?: string;
  kanbanStatusTrigger?: 'on_start' | 'on_complete';
}

@Schema({ timestamps: true })
export class WorkflowTemplate {
  @Prop({ type: SchemaTypes.ObjectId, index: true, default: null })
  tenantId: Types.ObjectId | null;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: false })
  isGlobal: boolean;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  nodes: WorkflowNode[];

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  edges: Array<{ from: string; to: string }>;
}

export const WorkflowTemplateSchema = SchemaFactory.createForClass(WorkflowTemplate);

export const GLOBAL_WORKFLOW_TEMPLATES: Partial<WorkflowTemplate>[] = [
  {
    name: 'Librarian Ingestion',
    description: 'Ingest and index codebase into Librarian knowledge base',
    isGlobal: true,
    nodes: [
      { id: 'n1', type: 'action', agentRole: 'librarian', requiresHumanApproval: false, description: 'Trigger codebase ingestion', nextNodeId: 'n2' },
      { id: 'n2', type: 'end', agentRole: '', requiresHumanApproval: false, description: 'Ingestion complete' },
    ],
    edges: [{ from: 'n1', to: 'n2' }],
  },
  {
    name: 'Product Strategy',
    description: 'PM agent defines epics and stories for a new feature',
    isGlobal: true,
    nodes: [
      { id: 'n1', type: 'action', agentRole: 'pm', requiresHumanApproval: false, description: 'Analyze requirements', nextNodeId: 'n2' },
      { id: 'n2', type: 'approval', agentRole: '', requiresHumanApproval: true, description: 'Human review of strategy', nextNodeId: 'n3' },
      { id: 'n3', type: 'action', agentRole: 'pm', requiresHumanApproval: false, description: 'Create epics and stories', nextNodeId: 'n4' },
      { id: 'n4', type: 'end', agentRole: '', requiresHumanApproval: false, description: 'Strategy complete' },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }],
  },
  {
    name: 'Feature Development',
    description: 'Full development cycle: implement → review → merge',
    isGlobal: true,
    nodes: [
      { id: 'n1', type: 'action', agentRole: 'developer', requiresHumanApproval: false, description: 'Implement feature', kanbanStatus: 'in_progress', kanbanStatusTrigger: 'on_start', nextNodeId: 'n2' },
      { id: 'n2', type: 'action', agentRole: 'reviewer', requiresHumanApproval: false, description: 'Code review', kanbanStatus: 'review', kanbanStatusTrigger: 'on_start', nextNodeId: 'n3' },
      { id: 'n3', type: 'approval', agentRole: '', requiresHumanApproval: true, description: 'Human approval before merge', nextNodeId: 'n4' },
      { id: 'n4', type: 'end', agentRole: '', requiresHumanApproval: false, description: 'Feature merged', kanbanStatus: 'done', kanbanStatusTrigger: 'on_complete' },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' }],
  },
  {
    name: 'Hotfix',
    description: 'Emergency fix: implement → review → immediate merge',
    isGlobal: true,
    nodes: [
      { id: 'n1', type: 'action', agentRole: 'developer', requiresHumanApproval: false, description: 'Implement hotfix', kanbanStatus: 'in_progress', kanbanStatusTrigger: 'on_start', nextNodeId: 'n2' },
      { id: 'n2', type: 'action', agentRole: 'reviewer', requiresHumanApproval: false, description: 'Quick review', kanbanStatus: 'review', kanbanStatusTrigger: 'on_start', nextNodeId: 'n3' },
      { id: 'n3', type: 'end', agentRole: '', requiresHumanApproval: false, description: 'Hotfix deployed', kanbanStatus: 'done', kanbanStatusTrigger: 'on_complete' },
    ],
    edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }],
  },
];
