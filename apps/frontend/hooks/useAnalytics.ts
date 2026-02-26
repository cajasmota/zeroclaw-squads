import { useQuery } from "@tanstack/react-query";
import { axiosGet } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

export function useAnalytics<T>(projectId: string, metric: string) {
  return useQuery({
    queryKey: KEYS.analytics(projectId, metric),
    queryFn: () => axiosGet<T>(`/api/projects/${projectId}/analytics?metric=${metric}`),
    enabled: !!projectId && !!metric,
  });
}
