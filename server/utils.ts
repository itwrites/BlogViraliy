export function normalizeBasePath(path: string | null | undefined): string {
  if (!path || path.trim() === "") return "";
  
  let normalized = path.trim();
  
  // Ensure it starts with /
  if (!normalized.startsWith("/")) {
    normalized = "/" + normalized;
  }
  
  // Remove trailing slash (unless it's just "/")
  while (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  
  // If it became just "/", return empty string (root)
  if (normalized === "/") return "";
  
  return normalized;
}
