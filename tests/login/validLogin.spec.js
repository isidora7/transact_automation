// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

test('valid login: admin can sign in and reach the dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Open app', async () => {
    await loginPage.goto();
  });

  await test.step('Log in with valid credentials', async () => {
    await loginPage.emailInput.fill(process.env.TEST_ADMIN_EMAIL);
    await loginPage.passwordInput.fill(process.env.TEST_ADMIN_PASSWORD);
    await loginPage.loginButton.click();
  });

  await test.step('Validate dashboard is reached', async () => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(dashboardPage.breadcrumb).toContainText('Dashboard');
    await expect(dashboardPage.dashboardNavLink).toBeVisible();
  });
});
