// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

test('unauthenticated user is redirected to login when visiting a protected route directly', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);

  await test.step('Visit /dashboard without a session', async () => {
    await dashboardPage.goto();
  });

  await test.step('Validate redirect to login with redirectedFrom', async () => {
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirectedFrom')).toBe('/dashboard');
  });
});

test('sign out redirects to login and clears the session', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Log in as admin', async () => {
    await loginPage.goto();
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await test.step('Sign out via the user menu', async () => {
    await dashboardPage.userMenuButton.click();
    await dashboardPage.signOutMenuItem.click();
  });

  await test.step('Validate redirect to login', async () => {
    await expect(page).toHaveURL(/\/login/);
  });

  await test.step('Validate the session is actually cleared, not just a client-side redirect', async () => {
    await dashboardPage.goto();
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('redirectedFrom')).toBe('/dashboard');
  });
});

test('authenticated user visiting /login directly is redirected to the dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Log in as admin', async () => {
    await loginPage.goto();
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await test.step('Revisit /login while still authenticated', async () => {
    await loginPage.goto();
  });

  await test.step('Validate redirect back to the dashboard', async () => {
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
