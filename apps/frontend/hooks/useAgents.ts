import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPatch, axiosPost } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface AgentInstance {
  _id: string;
  displayName: string;
  role: string;
  status: "idle" | "busy" | "error";
  tags: string[];
  soul?: string;
  pid?: number;
  templateId?: string;
  config?: { model: string; provider: string };
  aieos_identity?: Record<string, unknown>;
}

export function useAgents(projectId: string) {
  return useQuery({
    queryKey: KEYS.agents(projectId),
    queryFn: () => axiosGet<AgentInstance[]>(`/api/projects/${projectId}/agents`),
    enabled: !!projectId,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useUpdateAgent(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, payload }: { agentId: string; payload: Partial<AgentInstance> }) =>
      axiosPatch(`/api/projects/${projectId}/agents/${agentId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.agents(projectId) });
    },
  });
}

export function useSyncAgent(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, fields }: { agentId: string; fields: { soul: boolean; aieos: boolean; config: boolean } }) =>
      axiosPost(`/api/projects/${projectId}/agents/${agentId}/sync`, { fields }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.agents(projectId) });
    },
  });
}
