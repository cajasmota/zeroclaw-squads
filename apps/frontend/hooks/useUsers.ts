import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGet, axiosPost, axiosPatch } from "@/lib/api/axios";
import { KEYS } from "@/lib/api/query-keys";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "inactive";
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: KEYS.users(),
    queryFn: () => axiosGet<User[]>("/api/users"),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; email: string; password: string; role: "admin" | "member" }) =>
      axiosPost<User>("/api/users", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.users() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<User> }) =>
      axiosPatch<User>(`/api/users/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS.users() });
    },
  });
}
