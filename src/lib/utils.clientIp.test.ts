import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/utils";

// IMPORTANT: this lives in its own file (no mock of @/lib/utils) so it can
// exercise the REAL clientIp implementation. Other route tests need to mock
// clientIp away (to keep the rate-limit key stable), which would defeat this
// suite if they shared a file.

describe("clientIp anti-spoofing (Vague1-C hardened contract)", () => {
  it("trusts x-vercel-forwarded-for (set by Vercel's edge, not client-spoofable)", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({
        "x-vercel-forwarded-for": "203.0.113.1",
        // Even if the client forges x-forwarded-for, the Vercel edge header wins.
        "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      }),
    });
    expect(clientIp(req)).toBe("203.0.113.1");
  });

  it("does NOT trust client-supplied x-forwarded-for (would grant a fresh bucket per forged IP)", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({ "x-forwarded-for": "10.0.0.1, 192.168.1.1, 203.0.113.5" }),
    });
    expect(clientIp(req)).toBe("untrusted-proxy");
  });

  it("does NOT trust client-supplied x-real-ip", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({ "x-real-ip": "198.51.100.1" }),
    });
    expect(clientIp(req)).toBe("untrusted-proxy");
  });

  it("returns the shared sentinel when no trusted header is present", () => {
    const req = new Request("https://example.com");
    expect(clientIp(req)).toBe("untrusted-proxy");
  });
});
