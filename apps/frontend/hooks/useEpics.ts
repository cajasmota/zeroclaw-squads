import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface Epic {
  _id: string;
  title: string;
  status: string;
  description?: string;
}

export function useEpics(projectId: string) {
  return useQuery({
    queryKey: KEYS.epics(projectId),
    queryFn: () => axiosGet<Epic[]>(`/api/projects/${projectId}/epics`),
    enabled: !!projectId,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCreateEpic(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Epic>) =>
      axiosPost<Epic>(`/api/projects/${projectId}/epics`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.epics(projectId) });
    },
  });
}
