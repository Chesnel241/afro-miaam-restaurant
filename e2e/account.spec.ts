import { test, expect } from "@playwright/test";

/**
 * Authenticated account flow — signup → account page → logout.
 *
 * OPT-IN: this test WRITES a real user to the database and needs reCAPTCHA to
 * be permissive (NODE_ENV !== "production", where verifyRecaptcha returns true
 * without a token). Run it against a staging/dev instance:
 *
 *   PLAYWRIGHT_RUN_SIGNUP=1 PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *     npx playwright test account
 *
 * It uses a unique email per run so it can be repeated. It does NOT run by
 * default (skipped) to avoid polluting production data.
 */

const SHOULD_RUN = process.env.PLAYWRIGHT_RUN_SIGNUP === "1";

test.describe("Account flow (opt-in)", () => {
  test.skip(!SHOULD_RUN, "Set PLAYWRIGHT_RUN_SIGNUP=1 to run signup E2E (writes to DB).");

  test("signup → redirected to account → logout", async ({ page }) => {
    const unique = `e2e+${Date.now()}@example.com`;

    await page.goto("/login");

    // Switch to the signup tab.
    await page.getByRole("button", { name: "Créer un compte" }).click();

    await page.locator("#name").fill("E2E Tester");
    await page.locator("#phone").fill("0612345678");
    await page.locator("#email").fill(unique);
    await page.locator("#password").fill("motdepasse-solide-123");

    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // Customer lands on their account page.
    await expect(page).toHaveURL(/\/mon-compte$/, { timeout: 15_000 });
    await expect(page.locator("body")).toContainText(/E2E Tester|Mon Compte|Déconnexion/i);

    // Logout brings us back to login.
    await page.getByRole("button", { name: /Déconnexion|Se déconnecter/i }).first().click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
  });

  test("login with wrong password is rejected", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("nobody@example.com");
    await page.locator("#password").fill("definitely-wrong-pw");
    await page.getByRole("button", { name: "Se connecter" }).click();
    // Stays on /login and shows an error (generic, no enumeration).
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("body")).toContainText(/invalide|incorrect|réessayer|Identifiants/i);
  });
});
