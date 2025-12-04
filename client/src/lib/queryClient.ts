import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Convert /api/ URLs to /bv_api/ for reverse proxy compatibility
// The backend rewrites /bv_api/ back to /api/, so this works everywhere
function toProxyApiUrl(url: string): string {
  if (url.startsWith("/api/") || url === "/api") {
    return url.replace(/^\/api/, "/bv_api");
  }
  return url;
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
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(toProxyApiUrl(url), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 globally - redirect to login
  if (res.status === 401) {
    // Clear any cached auth state
    queryClient.setQueryData(["/api/auth/me"], null);
    // Dispatch custom event for auth handling
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = toProxyApiUrl(queryKey.join("/"));
    const res = await fetch(url, {
      credentials: "include",
    });

    if (res.status === 401) {
      // Clear any cached auth state
      queryClient.setQueryData(["/api/auth/me"], null);
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
      
      // Dispatch custom event for auth handling
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
