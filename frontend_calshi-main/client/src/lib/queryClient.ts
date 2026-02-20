import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? "https://backendcalshi-production.up.railway.app";

function toApiUrl(input: string) {
  if (input.startsWith("http://") || input.startsWith("https://")) return input;
  return `${API_BASE}${input.startsWith("/") ? "" : "/"}${input}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const res = await fetch(toApiUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    const url = toApiUrl(queryKey.join("/") as string);
    const res = await fetch(url, { credentials: "include" });

    if (on401 === "returnNull" && res.status === 401) return null as any;

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: false,
    },
    mutations: { retry: false },
  },
});