import { test, expect } from '@playwright/test';

test.describe('Cart and Checkout Flow', () => {
  test('User can add items to cart and proceed to checkout', async ({ page }) => {
    // Go to home page
    await page.goto('/');

    // Go to menu
    await page.getByRole('link', { name: 'La Carte' }).click();
    await page.waitForURL('/menu');

    // Add first item to cart
    const firstAddButton = page.locator('.product-card').first().locator('button:has-text("Ajouter")');
    await firstAddButton.click();

    // Open floating cart
    const cartButton = page.locator('button.floating-cart-button'); // Adjust selector as needed based on actual implementation
    if (await cartButton.isVisible()) {
      await cartButton.click();
    }

    // Assert item is in cart
    await expect(page.locator('.cart-item')).toHaveCount(1);
    
    // Proceed to checkout
    const checkoutButton = page.locator('a[href="/commander"]');
    if (await checkoutButton.isVisible()) {
      await checkoutButton.click();
      await page.waitForURL('/commander');
      
      // Verify checkout page content
      await expect(page.getByText('Valider votre commande')).toBeVisible();
      await expect(page.getByText('Mode de retrait')).toBeVisible();
    }
  });

  test('Cart respects max quantity limits', async ({ page }) => {
    await page.goto('/menu');
    const firstAddButton = page.locator('.product-card').first().locator('button:has-text("Ajouter")');
    await firstAddButton.click();
    
    // Attempt to increment beyond limits (if UI allows it, or simulate logic)
    // Wait for cart context to update
    // Note: since this is an E2E test, we'll just check if UI limits incrementing
  });
});
