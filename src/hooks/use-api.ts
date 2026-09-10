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

    // Read body as text first so we can inspect it if JSON parsing fails
    const text = await res.text();
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      // Server returned non-JSON (HTML error page, timeout, etc.)
      const preview = text.slice(0, 200).replace(/<[^>]+>/g, "").trim();
      const message = `Server error (${res.status}): ${preview || "No response body"}`;
      console.error("[useApi] Non-JSON response:", { status: res.status, path, body: text.slice(0, 500) });
      addNotification({ type: "error", title: "Error", message });
      throw new Error(message);
    }

    if (!res.ok || !json.success) {
      const message = (json.error as string) ?? "Request failed";
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
