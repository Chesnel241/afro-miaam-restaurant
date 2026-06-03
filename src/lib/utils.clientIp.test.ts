import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { clientIp } from "@/lib/utils";

// IMPORTANT: this lives in its own file (no mock of @/lib/utils) so it can
// exercise the REAL clientIp implementation. Other route tests need to mock
// clientIp away (to keep the rate-limit key stable), which would defeat this
// suite if they shared a file.

describe("clientIp anti-spoofing (Vague1-C hardened contract)", () => {
  const original = process.env.TRUSTED_PROXY;
  beforeEach(() => {
    delete process.env.TRUSTED_PROXY;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.TRUSTED_PROXY;
    else process.env.TRUSTED_PROXY = original;
  });

  describe("default (no trusted proxy configured)", () => {
    it("does NOT trust x-forwarded-for", () => {
      const req = new Request("https://example.com", {
        headers: new Headers({ "x-forwarded-for": "10.0.0.1" }),
      });
      expect(clientIp(req)).toBe("untrusted-proxy");
    });

    it("does NOT trust x-vercel-forwarded-for", () => {
      const req = new Request("https://example.com", {
        headers: new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }),
      });
      expect(clientIp(req)).toBe("untrusted-proxy");
    });

    it("does NOT trust x-real-ip", () => {
      const req = new Request("https://example.com", {
        headers: new Headers({ "x-real-ip": "198.51.100.1" }),
      });
      expect(clientIp(req)).toBe("untrusted-proxy");
    });

    it("returns the shared sentinel when no header is present", () => {
      const req = new Request("https://example.com");
      expect(clientIp(req)).toBe("untrusted-proxy");
    });
  });

  describe("TRUSTED_PROXY=vercel", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXY = "vercel";
    });

    it("trusts x-vercel-forwarded-for", () => {
      const req = new Request("https://example.com", {
        headers: new Headers({
          "x-vercel-forwarded-for": "203.0.113.1",
          "x-forwarded-for": "1.1.1.1, 2.2.2.2",
        }),
      });
      expect(clientIp(req)).toBe("203.0.113.1");
    });

    it("falls back to untrusted-proxy when the trusted header is absent", () => {
      const req = new Request("https://example.com", {
        headers: new Headers({ "x-forwarded-for": "10.0.0.1" }),
      });
      expect(clientIp(req)).toBe("untrusted-proxy");
    });
  });

  describe("TRUSTED_PROXY=caddy (self-hosted Hetzner stack)", () => {
    beforeEach(() => {
      process.env.TRUSTED_PROXY = "caddy";
    });

    it("trusts x-forwarded-for (leftmost = original client)", () => {
      const req = new Request("https://example.com", {
        headers: new Headers({
          "x-forwarded-for": "203.0.113.5, 10.0.0.1",
        }),
      });
      expect(clientIp(req)).toBe("203.0.113.5");
    });

    it("falls back to x-real-ip when x-forwarded-for is absent", () => {
      const req = new Request("https://example.com", {
        headers: new Headers({ "x-real-ip": "198.51.100.7" }),
      });
      expect(clientIp(req)).toBe("198.51.100.7");
    });

    it("returns untrusted-proxy when both are absent", () => {
      const req = new Request("https://example.com");
      expect(clientIp(req)).toBe("untrusted-proxy");
    });
  });
});
