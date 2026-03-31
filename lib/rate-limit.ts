import { NextRequest } from "next/server";

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

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;
const KEY_PREFIX = "global";

const store = globalThis.__nkabRateLimitStore ?? new Map<string, StoreValue>();

if (!globalThis.__nkabRateLimitStore) {
  globalThis.__nkabRateLimitStore = store;
}

function cleanupExpiredEntries(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function checkRateLimit(request: NextRequest): RateLimitResult {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const key = `${KEY_PREFIX}:${getClientIp(request)}`;
  const current = store.get(key);

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