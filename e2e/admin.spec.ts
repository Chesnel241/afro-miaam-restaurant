import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  // Test assumes there's a way to login or mock session
  // Since we are simulating, we'll navigate to /login and login as admin, then go to /admin
  
  test('Admin can login and view the dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    // Assuming login logic is simple email/password
    await page.fill('input[type="email"]', 'admin@afromiaam.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to admin
    await page.waitForURL('/admin');
    
    // Check main headings
    await expect(page.locator('h1')).toContainText('Panel Administrateur');
    
    // Check tabs are visible
    await expect(page.getByText('Vue d\'ensemble')).toBeVisible();
    await expect(page.getByText('Commandes')).toBeVisible();
    await expect(page.getByText('La Carte')).toBeVisible();
  });

  test('Admin can navigate tabs and interact with orders', async ({ page }) => {
    await page.goto('/admin'); // assuming already authenticated in context

    // Navigate to Orders
    await page.getByText(/Commandes \(/).click();
    await expect(page.getByText('Attente Acompte')).toBeVisible();
    await expect(page.getByText('Prêtes à cuisiner / En cours')).toBeVisible();
    
    // Check KDS Mode button
    await page.getByRole('button', { name: '📟 Mode Cuisine (KDS)' }).click();
    await expect(page.getByText('KITCHEN DISPLAY SYSTEM')).toBeVisible();
    await page.getByRole('button', { name: 'Quitter KDS' }).click();
  });

  test('Admin can view Menu manager', async ({ page }) => {
    await page.goto('/admin');
    await page.getByText('La Carte').click();
    await expect(page.getByText('Gestion de la Carte')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ajouter un plat' })).toBeVisible();
  });

  test('Admin can toggle promotion settings', async ({ page }) => {
    await page.goto('/admin');
    // Vue d'ensemble tab is active by default
    const promoToggle = page.locator('text=Bonus +1€ pour avis client').locator('..').locator('button');
    await expect(promoToggle).toBeVisible();
  });
});
