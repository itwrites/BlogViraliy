import { createContext, useContext, useCallback, useMemo } from "react";
import type { Site } from "@shared/schema";

interface BasePathContextType {
  basePath: string;
  prefixPath: (path: string) => string;
  getFullUrl: (path: string) => string;
  domain: string;
}

const BasePathContext = createContext<BasePathContextType>({
  basePath: "",
  prefixPath: (path) => path,
  getFullUrl: (path) => path,
  domain: "",
});

interface BasePathProviderProps {
  site: Site;
  children: React.ReactNode;
}

export function BasePathProvider({ site, children }: BasePathProviderProps) {
  const basePath = site.basePath || "";
  const domain = site.domain || "";

  const prefixPath = useCallback(
    (path: string): string => {
      if (!basePath) return path;
      
      // Don't prefix external URLs
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
        return path;
      }
      
      // Handle hash and query params
      if (path.startsWith("#") || path.startsWith("?")) {
        return path;
      }
      
      // Normalize the path
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      
      // Already has base path prefix
      if (normalizedPath.startsWith(basePath + "/") || normalizedPath === basePath) {
        return normalizedPath;
      }
      
      // Add base path prefix
      return `${basePath}${normalizedPath}`;
    },
    [basePath]
  );

  const getFullUrl = useCallback(
    (path: string): string => {
      const protocol = typeof window !== "undefined" 
        ? (window.location.protocol === "http:" ? "http://" : "https://")
        : "https://";
      
      const prefixedPath = prefixPath(path);
      return `${protocol}${domain}${prefixedPath}`;
    },
    [domain, prefixPath]
  );

  const value = useMemo(
    () => ({
      basePath,
      prefixPath,
      getFullUrl,
      domain,
    }),
    [basePath, prefixPath, getFullUrl, domain]
  );

  return (
    <BasePathContext.Provider value={value}>
      {children}
    </BasePathContext.Provider>
  );
}

export function useBasePath() {
  return useContext(BasePathContext);
}

// Utility hook for navigation with base path
export function useBasePathNavigation() {
  const { prefixPath } = useBasePath();
  
  const navigate = useCallback(
    (path: string, options?: { replace?: boolean }) => {
      const prefixedPath = prefixPath(path);
      if (options?.replace) {
        window.history.replaceState(null, "", prefixedPath);
      } else {
        window.history.pushState(null, "", prefixedPath);
      }
      // Dispatch popstate event to trigger wouter navigation
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [prefixPath]
  );
  
  return navigate;
}
