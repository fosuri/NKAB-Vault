import { checkRateLimit } from "../../lib/rate-limit";

function requestWithHeaders(headers: Record<string, string | null>) {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  } as never;
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    globalThis.__nkabRateLimitStore?.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.__nkabRateLimitStore?.clear();
  });

  // Verifies that a normal request goes through and returns the updated quota limit.
  it("allows the first request and reports the remaining quota", () => {
    const result = checkRateLimit(requestWithHeaders({ "x-forwarded-for": "203.0.113.10" }));

    expect(result).toEqual({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60_000,
      retryAfter: 0,
    });
  });

  // Ensures that one user spamming requests doesn't block another user from accessing the site.
  it("tracks each client IP independently", () => {
    const firstClient = requestWithHeaders({ "x-forwarded-for": "203.0.113.10" });
    const secondClient = requestWithHeaders({ "x-forwarded-for": "203.0.113.20" });

    checkRateLimit(firstClient);
    checkRateLimit(firstClient);

    expect(checkRateLimit(firstClient).remaining).toBe(97);
    expect(checkRateLimit(secondClient).remaining).toBe(99);
  });

  // Accurately finds the real user's IP even if they are connecting through intermediate proxies.
  it("uses the first forwarded IP when a proxy chain is present", () => {
    const proxiedRequest = requestWithHeaders({
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
    });
    const directRequest = requestWithHeaders({ "x-forwarded-for": "203.0.113.10" });

    checkRateLimit(proxiedRequest);

    expect(checkRateLimit(directRequest).remaining).toBe(98);
  });

  // Supports alternative header formats for reading the user's IP.
  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const realIpRequest = requestWithHeaders({ "x-real-ip": "198.51.100.15" });

    checkRateLimit(realIpRequest);

    expect(checkRateLimit(realIpRequest).remaining).toBe(98);
  });

  // Checks that requests are properly blocked and a retry time is given once the limit is hit.
  it("rejects requests after the quota is exhausted", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "203.0.113.10" });

    for (let index = 0; index < 100; index += 1) {
      expect(checkRateLimit(request).success).toBe(true);
    }

    expect(checkRateLimit(request)).toMatchObject({
      success: false,
      limit: 100,
      remaining: 0,
      retryAfter: 60,
    });
  });

  // Confirms that the user's limit is refreshed and they can connect again after waiting.
  it("starts a new window after the reset time passes", () => {
    const request = requestWithHeaders({ "x-forwarded-for": "203.0.113.10" });

    checkRateLimit(request);
    jest.advanceTimersByTime(60_001);

    expect(checkRateLimit(request)).toMatchObject({
      success: true,
      remaining: 99,
      retryAfter: 0,
    });
  });
});
