import { axiosGet, axiosPost, axiosPatch, axiosDelete } from "./axios";
import type { AxiosError } from "axios";

function extractMessage(error: unknown): string {
  const axiosErr = error as AxiosError<{ message?: string }>;
  return axiosErr?.response?.data?.message ?? (error instanceof Error ? error.message : "Request failed");
}

export function apiGet<T>(path: string, _token?: string): Promise<T> {
  return axiosGet<T>(path).catch((err) => { throw new Error(extractMessage(err)); });
}

export function apiPost<T>(path: string, body: unknown, _token?: string): Promise<T> {
  return axiosPost<T>(path, body).catch((err) => { throw new Error(extractMessage(err)); });
}

export function apiPatch<T>(path: string, body: unknown, _token?: string): Promise<T> {
  return axiosPatch<T>(path, body).catch((err) => { throw new Error(extractMessage(err)); });
}

export function apiDelete<T>(path: string, _token?: string): Promise<T> {
  return axiosDelete<T>(path).catch((err) => { throw new Error(extractMessage(err)); });
}
