import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost, axiosPatch } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface AgentTemplate {
  _id: string;
  displayName: string;
  role: string;
  tags: string[];
  soul: string;
  aieos_identity: Record<string, unknown>;
  config: {
    model: string;
    provider: string;
    canWriteCode: boolean;
    skills: string;
    mcpServers: string[];
  };
  createdAt: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: KEYS.templates(),
    queryFn: () => axiosGet<AgentTemplate[]>("/api/templates"),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AgentTemplate>) =>
      axiosPost<AgentTemplate>("/api/templates", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.templates() });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AgentTemplate> }) =>
      axiosPatch<AgentTemplate>(`/api/templates/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.templates() });
    },
  });
}
