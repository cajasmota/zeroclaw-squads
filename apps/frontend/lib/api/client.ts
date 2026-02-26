async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body?.message ?? res.statusText);
  }

  return res.json();
}

export function apiGet<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export function apiDelete<T>(path: string, token?: string): Promise<T> {
  return request<T>(path, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
