import { NextRequest } from "next/server";

// Simple in-memory store for rate limiting. 
// NOTE: For multi-instance deployments (e.g. Vercel, AWS Lambda), 
// this should be replaced with Redis (e.g., @upstash/ratelimit)
const rateLimitStore = new Map<string, { count: number; expiresAt: number }>();

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export function checkRateLimit(req: NextRequest, action: string, config: RateLimitConfig): { success: boolean; limit: number; remaining: number; reset: Date } {
  // Try to get IP from headers, fallback to a generic token or "unknown"
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || "unknown-ip");
  
  const key = `${action}:${ip}`;
  const now = Date.now();
  
  const record = rateLimitStore.get(key);
  
  if (!record || record.expiresAt < now) {
    // New or expired window
    rateLimitStore.set(key, { count: 1, expiresAt: now + config.windowMs });
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      reset: new Date(now + config.windowMs)
    };
  }
  
  // Existing window
  if (record.count >= config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: new Date(record.expiresAt)
    };
  }
  
  record.count += 1;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    reset: new Date(record.expiresAt)
  };
}

export function clearRateLimit(req: NextRequest, action: string) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || "unknown-ip");
  
  const key = `${action}:${ip}`;
  rateLimitStore.delete(key);
}
