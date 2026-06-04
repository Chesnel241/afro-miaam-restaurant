import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — these MUST be declared before the route is imported.
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => {
  class AuthError extends Error {
    status: number;
    constructor(message: string, status = 401) {
      super(message);
      this.name = "AuthError";
      this.status = status;
    }
  }
  return {
    AuthError,
    requireAdmin: vi.fn(),
    authErrorResponse: (e: unknown) => {
      if (e instanceof AuthError) {
        return Response.json({ error: e.message }, { status: e.status });
      }
      return Response.json({ error: "Non autorisé." }, { status: 401 });
    },
  };
});

vi.mock("@/lib/rate-limit-store", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

// Capture writeFile invocations without touching the disk. mkdir is a no-op.
// Declared via vi.hoisted so they exist when the hoisted vi.mock factory runs.
const { mkdirMock, writeFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn().mockResolvedValue(undefined),
  writeFileMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:fs", () => ({
  promises: {
    mkdir: mkdirMock,
    writeFile: writeFileMock,
  },
}));

// ---------------------------------------------------------------------------
import { POST } from "./route";
import { requireAdmin, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeAdmin = {
  sub: "admin-1",
  email: "admin@example.com",
  email_verified: true,
  role: "admin" as const,
};

function buildUploadRequest(file: File): Request {
  const fd = new FormData();
  fd.append("file", file);
  return new Request("http://localhost/api/admin/menu/upload", {
    method: "POST",
    headers: { Authorization: "Bearer admin-token" },
    body: fd,
  });
}

function fileFromBytes(bytes: number[], name: string, type = "application/octet-stream"): File {
  // Build the underlying ArrayBuffer first so `new File([buf], …)` carries the
  // exact bytes (avoid passing a Buffer / Uint8Array that might get coerced).
  const arr = new Uint8Array(bytes);
  return new File([arr], name, { type });
}

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const GIF_HEADER = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00];
// "RIFF????WEBP" + padding
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/admin/menu/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkRateLimit as any).mockResolvedValue(true);
    (requireAdmin as any).mockResolvedValue(fakeAdmin);
    mkdirMock.mockResolvedValue(undefined);
    writeFileMock.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    (requireAdmin as any).mockRejectedValueOnce(new AuthError("Non autorisé.", 401));
    const res = await POST(buildUploadRequest(fileFromBytes(JPEG_HEADER, "x.jpg")));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not admin", async () => {
    (requireAdmin as any).mockRejectedValueOnce(new AuthError("Accès refusé.", 403));
    const res = await POST(buildUploadRequest(fileFromBytes(JPEG_HEADER, "x.jpg")));
    expect(res.status).toBe(403);
  });

  it("returns 429 when the rate limiter denies", async () => {
    (checkRateLimit as any).mockResolvedValueOnce(false);
    const res = await POST(buildUploadRequest(fileFromBytes(JPEG_HEADER, "x.jpg")));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe("Trop de requêtes.");
  });

  it("returns 400 when no file is provided", async () => {
    const fd = new FormData();
    const req = new Request("http://localhost/api/admin/menu/upload", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token" },
      body: fd,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Fichier manquant.");
  });

  it("returns 413 for a zero-byte file", async () => {
    const res = await POST(buildUploadRequest(fileFromBytes([], "empty.jpg", "image/jpeg")));
    expect(res.status).toBe(413);
  });

  it("returns 413 when the file exceeds 5 MiB", async () => {
    // 5 MiB + 1 byte. Start with JPEG magic to prove the size check fires first.
    const bigBytes = new Uint8Array(5 * 1024 * 1024 + 1);
    bigBytes[0] = 0xff;
    bigBytes[1] = 0xd8;
    bigBytes[2] = 0xff;
    const f = new File([bigBytes], "big.jpg", { type: "image/jpeg" });
    const res = await POST(buildUploadRequest(f));
    expect(res.status).toBe(413);
  });

  it("accepts a JPEG (magic FF D8 FF) and forces a .jpg url", async () => {
    const res = await POST(buildUploadRequest(fileFromBytes(JPEG_HEADER, "photo.bin")));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/\.jpg$/);
    expect(data.contentType).toBe("image/jpeg");
    expect(writeFileMock).toHaveBeenCalledTimes(1);
  });

  it("accepts a PNG (magic 89 50 4E 47 …) and forces a .png url", async () => {
    const res = await POST(buildUploadRequest(fileFromBytes(PNG_HEADER, "icon.bin")));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/\.png$/);
    expect(data.contentType).toBe("image/png");
  });

  it("accepts a GIF (GIF89a) and forces a .gif url", async () => {
    const res = await POST(buildUploadRequest(fileFromBytes(GIF_HEADER, "anim.bin")));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/\.gif$/);
    expect(data.contentType).toBe("image/gif");
  });

  it("accepts a WebP (RIFF…WEBP) and forces a .webp url", async () => {
    const res = await POST(buildUploadRequest(fileFromBytes(WEBP_HEADER, "pic.bin")));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toMatch(/\.webp$/);
    expect(data.contentType).toBe("image/webp");
  });

  it("rejects an SVG payload (stored-XSS guard)", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const bytes = Array.from(new TextEncoder().encode(svg));
    const res = await POST(
      buildUploadRequest(fileFromBytes(bytes, "evil.svg", "image/svg+xml")),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      "Format d'image non supporté (JPEG, PNG, WebP, GIF uniquement).",
    );
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("rejects an HTML payload (`<html>`)", async () => {
    const html = "<html><body><script>alert(1)</script></body></html>";
    const bytes = Array.from(new TextEncoder().encode(html));
    const res = await POST(buildUploadRequest(fileFromBytes(bytes, "x.html", "text/html")));
    expect(res.status).toBe(400);
  });

  it("rejects random garbage that does not match any known magic", async () => {
    const junk = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b];
    const res = await POST(buildUploadRequest(fileFromBytes(junk, "garbage.dat")));
    expect(res.status).toBe(400);
  });

  it("forces .jpg extension when the client names the file `evil.svg` but ships JPEG bytes", async () => {
    const res = await POST(
      buildUploadRequest(fileFromBytes(JPEG_HEADER, "evil.svg", "image/svg+xml")),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    // The URL MUST end in .jpg, never .svg.
    expect(data.url).toMatch(/\.jpg$/);
    expect(data.url).not.toMatch(/\.svg/);
  });

  it("sanitizes path-traversal names (`../../etc/passwd`)", async () => {
    const res = await POST(
      buildUploadRequest(fileFromBytes(JPEG_HEADER, "../../etc/passwd")),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    // The URL must not contain `..` segments.
    expect(data.url).not.toContain("..");
    expect(data.url).toMatch(/^\/uploads\//);
  });
});
