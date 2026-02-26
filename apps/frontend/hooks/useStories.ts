import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost, axiosPatch } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface Story {
  _id: string;
  title: string;
  type: "feature" | "bug" | "chore" | "epic";
  status: string;
  priority: "low" | "medium" | "high" | "critical";
  workflowNodeStatus?: string;
  waitingForApproval?: boolean;
  waitingForAnswer?: boolean;
  epicId?: string;
  sprintId?: string;
  description?: string;
  assignedTo?: string[];
  runId?: string;
  branchName?: string;
}

export function useStories(projectId: string) {
  return useQuery({
    queryKey: KEYS.stories(projectId),
    queryFn: () => axiosGet<Story[]>(`/api/projects/${projectId}/stories`),
    enabled: !!projectId,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCreateStory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Story>) =>
      axiosPost<Story>(`/api/projects/${projectId}/stories`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.stories(projectId) });
    },
  });
}

export function useUpdateStory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, payload }: { storyId: string; payload: Partial<Story> }) =>
      axiosPatch(`/api/projects/${projectId}/stories/${storyId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.stories(projectId) });
    },
  });
}

export function useApproveStory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, approved }: { storyId: string; approved: boolean }) =>
      axiosPost(`/api/projects/${projectId}/stories/${storyId}/approve`, { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.stories(projectId) });
    },
  });
}

export function useAnswerStory(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, answer }: { storyId: string; answer: string }) =>
      axiosPost(`/api/projects/${projectId}/stories/${storyId}/answer`, { answer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.stories(projectId) });
    },
  });
}
