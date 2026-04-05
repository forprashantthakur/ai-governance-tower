import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE" | "PUT";

export function useApi() {
  const token = useAuthStore((s) => s.token);
  const addNotification = useUIStore((s) => s.addNotification);

  async function request<T>(
    path: string,
    method: HttpMethod = "GET",
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`/api${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    if (res.status === 204) return undefined as T;

    const json = await res.json();

    if (!res.ok || !json.success) {
      const message = json.error ?? "Request failed";
      addNotification({ type: "error", title: "Error", message });
      throw new Error(message);
    }

    return json.data as T;
  }

  return {
    get: <T>(path: string) => request<T>(path, "GET"),
    post: <T>(path: string, body: unknown) => request<T>(path, "POST", body),
    patch: <T>(path: string, body: unknown) => request<T>(path, "PATCH", body),
    del: <T>(path: string) => request<T>(path, "DELETE"),
  };
}
