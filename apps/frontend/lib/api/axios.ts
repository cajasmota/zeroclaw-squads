import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "",
  headers: {
    "Content-Type": "application/json",
  },
});

// On 401, redirect to login
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export function axiosGet<T>(path: string): Promise<T> {
  return axiosInstance.get<T>(path).then((r) => r.data);
}

export function axiosPost<T>(path: string, body?: unknown): Promise<T> {
  return axiosInstance.post<T>(path, body).then((r) => r.data);
}

export function axiosPatch<T>(path: string, body?: unknown): Promise<T> {
  return axiosInstance.patch<T>(path, body).then((r) => r.data);
}

export function axiosDelete<T>(path: string): Promise<T> {
  return axiosInstance.delete<T>(path).then((r) => r.data);
}

export default axiosInstance;
