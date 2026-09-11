// @ts-check
import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ADMIN_STORAGE_STATE, DISPATCHER_ONE_STORAGE_STATE } from './authStorage';

// Runs once per project (see `dependencies: ['setup']` in playwright.config.js) instead
// of every test logging in fresh through the UI. Serialized so the two logins never hit
// Supabase Auth at the same time.
setup.describe.configure({ mode: 'serial' });

setup('authenticate as admin', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});

setup('authenticate as dispatcher', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(process.env.TEST_DISPATCHER_ONE_EMAIL, process.env.TEST_DISPATCHER_ONE_PASSWORD);
  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: DISPATCHER_ONE_STORAGE_STATE });
});
