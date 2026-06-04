import { test, expect } from "@playwright/test";

/**
 * Public smoke tests — no auth, no DB seeding required.
 * Safe to run against a live deployment:
 *   PLAYWRIGHT_BASE_URL=https://afromiaam.com npx playwright test smoke
 *
 * These assert the stable, public surface of the site so a broken deploy
 * (white screen, 500, missing CSS, dead nav) is caught immediately.
 */

test.describe("Public surface", () => {
  test("home page renders", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.ok()).toBeTruthy();
    // Brand name is present somewhere in the document.
    await expect(page.locator("body")).toContainText(/Afro\s*Miaam/i);
    // Main nav is present.
    await expect(page.getByRole("link", { name: "La Carte" }).first()).toBeVisible();
  });

  test("menu page lists the carte", async ({ page }) => {
    await page.goto("/menu");
    await expect(page.getByText("Notre carte")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // At least one "add to cart" control should be present once the menu loads.
    await expect(
      page.getByRole("button", { name: /Ajouter .* au panier/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("nav: home → menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "La Carte" }).first().click();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test("login page shows email + password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/i })).toBeVisible();
  });

  test("health endpoint returns ok JSON", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("public menu API returns items", async ({ request }) => {
    const res = await request.get("/api/menu");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
  });

  test("legal pages load", async ({ page }) => {
    for (const path of ["/cgv", "/confidentialite", "/mentions-legales"]) {
      const res = await page.goto(path);
      expect(res?.ok(), `${path} should load`).toBeTruthy();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("protected admin route does not expose data to anonymous users", async ({ page }) => {
    await page.goto("/admin");
    // Either redirected away from /admin, or the dashboard content is not shown.
    // We assert no admin-only heading is visible to an anonymous visitor.
    await expect(page.getByText("Panel Administrateur")).toHaveCount(0);
  });
});
