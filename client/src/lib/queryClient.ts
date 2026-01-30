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

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  try {
    const res = await fetch(toProxyApiUrl("/api/auth/csrf"), {
      credentials: "include",
    });
    if (!res.ok) {
      return null;
    }
    const tokenFromHeader = res.headers.get("x-csrf-token");
    const data = await res.json().catch(() => null);
    const token = tokenFromHeader || (data && data.csrfToken) || null;
    if (token) {
      csrfToken = token;
    }
    return token;
  } catch {
    return null;
  }
}

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().finally(() => {
      csrfTokenPromise = null;
    });
  }
  return csrfTokenPromise;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const upperMethod = method.toUpperCase();
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (!["GET", "HEAD", "OPTIONS"].includes(upperMethod)) {
    const token = await ensureCsrfToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  }

  const res = await fetch(toProxyApiUrl(url), {
    method: upperMethod,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  const tokenFromHeader = res.headers.get("x-csrf-token");
  if (tokenFromHeader) {
    csrfToken = tokenFromHeader;
  }

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
