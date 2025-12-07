// Analytics utilities for parsing user-agent and getting geolocation

// Device type detection from user-agent
export function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (/mobile|android(?!.*tablet)|iphone|ipod|blackberry|iemobile|opera mini|opera mobi/i.test(ua)) {
    return "mobile";
  }
  if (/tablet|ipad|android(?=.*tablet)|kindle|silk|playbook/i.test(ua)) {
    return "tablet";
  }
  return "desktop";
}

// Browser detection from user-agent
export function getBrowserName(userAgent: string): string {
  const ua = userAgent;
  
  // Order matters - check more specific patterns first
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Chrome\//i.test(ua)) return "Chrome";
  if (/MSIE|Trident/i.test(ua)) return "IE";
  
  return "Other";
}

// Free geolocation API lookup (ip-api.com - 45 requests per minute free tier)
// Returns country code or "Unknown"
export async function getCountryFromIP(ip: string): Promise<string> {
  console.log(`[GeoIP] Looking up country for IP: ${ip}`);
  
  // Skip private/local IPs
  if (
    ip === "127.0.0.1" || 
    ip === "::1" || 
    ip.startsWith("192.168.") || 
    ip.startsWith("10.") ||
    ip.startsWith("172.") ||
    ip === "localhost"
  ) {
    console.log(`[GeoIP] Skipping private/local IP: ${ip}`);
    return "Local";
  }
  
  try {
    // ip-api.com is free for non-commercial use with 45 req/min limit
    // Using fields parameter to minimize response size
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode`, {
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    
    if (!response.ok) {
      console.log(`[GeoIP] API returned non-OK status: ${response.status}`);
      return "Unknown";
    }
    
    const data = await response.json();
    console.log(`[GeoIP] API response for ${ip}:`, data);
    if (data.status === "success" && data.countryCode) {
      return data.countryCode;
    }
    return "Unknown";
  } catch (error) {
    // Fail silently - geolocation is not critical
    console.log(`[GeoIP] Error looking up IP ${ip}:`, error);
    return "Unknown";
  }
}

// Get client IP from request (handles proxies)
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  // X-Forwarded-For can contain multiple IPs, first one is the client
  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = typeof forwardedFor === "string" 
      ? forwardedFor.split(",").map(ip => ip.trim())
      : forwardedFor;
    return ips[0] || "Unknown";
  }
  
  // Try other common headers
  const realIP = headers["x-real-ip"];
  if (realIP) {
    return typeof realIP === "string" ? realIP : realIP[0] || "Unknown";
  }
  
  return "Unknown";
}

// Get today's date in YYYY-MM-DD format
export function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// Increment a value in a breakdown object
export function incrementBreakdown(breakdown: Record<string, number>, key: string): Record<string, number> {
  return {
    ...breakdown,
    [key]: (breakdown[key] || 0) + 1,
  };
}
