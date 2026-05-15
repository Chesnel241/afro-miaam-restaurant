import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/utils";

describe("Rate Limiter IP Anti-Spoofing", () => {
  it("extracts x-vercel-forwarded-for securely", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({
        "x-vercel-forwarded-for": "203.0.113.1",
        "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      }),
    });
    // x-vercel-forwarded-for has priority and cannot be spoofed easily from outside Vercel's edge
    expect(clientIp(req)).toBe("203.0.113.1");
  });

  it("extracts the last IP from x-forwarded-for when vercel header is missing", () => {
    // When an attacker spoofs the header with "10.0.0.1", the load balancer appends the real IP "203.0.113.5" at the end.
    const req = new Request("https://example.com", {
      headers: new Headers({
        "x-forwarded-for": "10.0.0.1, 192.168.1.1, 203.0.113.5",
      }),
    });
    expect(clientIp(req)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip if present", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({
        "x-real-ip": "198.51.100.1",
      }),
    });
    expect(clientIp(req)).toBe("198.51.100.1");
  });

  it("returns unknown if no headers are present", () => {
    const req = new Request("https://example.com");
    expect(clientIp(req)).toBe("unknown");
  });
});
