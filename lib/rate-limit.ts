import { NextRequest } from "next/server";

/**
 * Implements a global request throttling mechanism to prevent API abuse.
 * Uses an in-memory sliding window algorithm for high-performance rate limiting.
 */

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
};

type StoreValue = {
  count: number;
  resetAt: number;
};

declare global {
  var __nkabRateLimitStore: Map<string, StoreValue> | undefined;
}

const WINDOW_MS = 60_000; // 1-minute tracking window
const MAX_REQUESTS = 100; // Threshold before throttling
const KEY_PREFIX = "global";

// 1. Maintain a persistent store across hot reloads in development
const store = globalThis.__nkabRateLimitStore ?? new Map<string, StoreValue>();

if (!globalThis.__nkabRateLimitStore) {
  globalThis.__nkabRateLimitStore = store;
}

/**
 * Periodically purges stale tracking entries to maintain memory efficiency.
 */
function cleanupExpiredEntries(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Extracts the most reliable client IP address from proxy headers.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Evaluates the current request against throttling thresholds.
 */
export function checkRateLimit(request: NextRequest): RateLimitResult {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const key = `${KEY_PREFIX}:${getClientIp(request)}`;
  const current = store.get(key);

  // 1. Initialization: Start a new tracking window for a first-time or expired requester
  if (!current || now > current.resetAt) {
    const resetAt = now + WINDOW_MS;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      reset: resetAt,
      retryAfter: 0,
    };
  }

  // 2. Increment: update counters for active tracking windows
  current.count += 1;
  const remaining = Math.max(MAX_REQUESTS - current.count, 0);
  const success = current.count <= MAX_REQUESTS;
  const retryAfter = success ? 0 : Math.ceil((current.resetAt - now) / 1000);

  return {
    success,
    limit: MAX_REQUESTS,
    remaining,
    reset: current.resetAt,
    retryAfter,
  };
}