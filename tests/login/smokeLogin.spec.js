// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test('smoke: login page shows email, password, and login button', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Open app', async () => {
    await loginPage.goto();
  });

  await test.step('Validate login page', async () => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
  });
});
