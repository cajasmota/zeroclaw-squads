import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost, axiosPatch, axiosDelete } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: { parameter_size?: string; family?: string };
}

interface OllamaStatus {
  healthy: boolean;
  models: OllamaModel[];
}

interface Providers {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
  ollama: boolean;
}

export function useModelStatus() {
  return useQuery({
    queryKey: KEYS.models(),
    queryFn: () => axiosGet<OllamaStatus>("/api/models?action=status"),
  });
}

export function useModelProviders() {
  return useQuery({
    queryKey: KEYS.modelProviders(),
    queryFn: () => axiosGet<Providers>("/api/models?action=providers"),
  });
}

export function usePullModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (model: string) => axiosPost("/api/models", { action: "pull", model }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.models() });
    },
  });
}

export function useDeleteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (model: string) =>
      axiosDelete(`/api/models?model=${encodeURIComponent(model)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.models() });
    },
  });
}

export function useLoadModel() {
  return useMutation({
    mutationFn: (model: string) => axiosPost("/api/models", { action: "load", model }),
  });
}

export function useUnloadModel() {
  return useMutation({
    mutationFn: (model: string) => axiosPost("/api/models", { action: "unload", model }),
  });
}

export function useToggleProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ provider, enabled }: { provider: string; enabled: boolean }) =>
      axiosPatch("/api/models", { provider, enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.modelProviders() });
    },
  });
}
