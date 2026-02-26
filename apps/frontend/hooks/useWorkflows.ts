import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface WorkflowTemplate {
  _id: string;
  name: string;
  description?: string;
  nodes?: unknown[];
  edges?: unknown[];
}

interface WorkflowRun {
  _id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  currentNodeId: string;
  nodeExecutions: Array<{
    nodeId: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    agentInstanceId?: string;
  }>;
}

export function useWorkflows(projectId: string) {
  return useQuery({
    queryKey: KEYS.workflows(projectId),
    queryFn: () => axiosGet<WorkflowRun[]>(`/api/projects/${projectId}/workflows`),
    enabled: !!projectId,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: KEYS.workflowTemplates(),
    queryFn: () => axiosGet<WorkflowTemplate[]>("/api/workflows/templates"),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<WorkflowTemplate>) =>
      axiosPost<WorkflowTemplate>("/api/workflows/templates", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.workflowTemplates() });
    },
  });
}

export function useTriggerWorkflow(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      axiosPost(`/api/projects/${projectId}/workflows`, { templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.workflows(projectId) });
    },
  });
}
