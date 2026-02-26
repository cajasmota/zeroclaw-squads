import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface Sprint {
  _id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

export function useSprints(projectId: string) {
  return useQuery({
    queryKey: KEYS.sprints(projectId),
    queryFn: () => axiosGet<Sprint[]>(`/api/projects/${projectId}/sprints`),
    enabled: !!projectId,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCreateSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Sprint>) =>
      axiosPost<Sprint>(`/api/projects/${projectId}/sprints`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.sprints(projectId) });
    },
  });
}
