import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPatch } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface Requirements {
  content: string;
}

export function useRequirements(projectId: string) {
  return useQuery({
    queryKey: KEYS.requirements(projectId),
    queryFn: () => axiosGet<Requirements>(`/api/projects/${projectId}/requirements`),
    enabled: !!projectId,
  });
}

export function useUpdateRequirements(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      axiosPatch(`/api/projects/${projectId}/requirements`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.requirements(projectId) });
    },
  });
}
