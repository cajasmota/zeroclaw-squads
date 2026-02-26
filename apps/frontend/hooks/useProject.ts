import { useQuery } from "@tanstack/react-query";
import { axiosGet } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface Project {
  _id: string;
  name: string;
  slug: string;
  brandColor: string;
  status: string;
  config?: Record<string, unknown>;
}

export function useProject(id: string) {
  return useQuery({
    queryKey: KEYS.project(id),
    queryFn: () => axiosGet<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: KEYS.projects(),
    queryFn: () => axiosGet<Project[]>("/api/projects"),
  });
}
