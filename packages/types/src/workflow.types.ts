export type WorkflowNodeType = 'start' | 'agent_task' | 'approval_gate' | 'condition' | 'end';
export type WorkflowRunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
