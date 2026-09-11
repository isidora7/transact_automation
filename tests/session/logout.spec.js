// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { ADMIN_STORAGE_STATE } from '../authStorage';

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
  // Deliberately logs in fresh via the UI as the dispatcher, not admin, and does not
  // reuse a shared storageState: exTransact's sign-out calls supabase.auth.signOut()
  // with the default 'global' scope, which revokes EVERY session for that user,
  // including the one saved to admin.json by auth.setup.js. Signing out as admin
  // here would silently break any other test in this run that reuses the admin
  // storageState afterward (confirmed: it broke the "already authenticated" test
  // below until this was switched to the dispatcher account).
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Log in as dispatcher', async () => {
    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_DISPATCHER_ONE_EMAIL,
      process.env.TEST_DISPATCHER_ONE_PASSWORD,
    );
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

test.describe('already authenticated', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('authenticated user visiting /login directly is redirected to the dashboard', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await test.step('Visit /login while already authenticated', async () => {
      await loginPage.goto();
    });

    await test.step('Validate redirect back to the dashboard', async () => {
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });
});
