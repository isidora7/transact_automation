// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { OrganisationPage } from '../../pages/OrganisationPage';

test('admin sees the Organisation nav link on the dashboard', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Log in as admin', async () => {
    await loginPage.goto();
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await test.step('Validate Organisation link is visible', async () => {
    await expect(dashboardPage.organisationNavLink).toBeVisible();
  });
});

test('dispatcher does not see the Organisation nav link on the dashboard', async ({ page }) => {
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

  await test.step('Validate Organisation link is absent', async () => {
    await expect(dashboardPage.dashboardNavLink).toBeVisible();
    await expect(dashboardPage.organisationNavLink).toHaveCount(0);
  });
});

test('admin can navigate to the Organisation page via the sidebar', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);
  const organisationPage = new OrganisationPage(page);

  await test.step('Log in as admin', async () => {
    await loginPage.goto();
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await test.step('Click Organisation in the sidebar', async () => {
    await dashboardPage.organisationNavLink.click();
  });

  await test.step('Validate the Organisation page loaded', async () => {
    await expect(page).toHaveURL(/\/organisation/);
    await expect(organisationPage.orgNameHeading).toBeVisible();
    await expect(organisationPage.rosterLabel).toBeVisible();
  });
});

test('user menu shows profile and sign-out options', async ({ page }) => {
  const loginPage = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await test.step('Log in as admin', async () => {
    await loginPage.goto();
    await loginPage.login(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  await test.step('Open the user menu', async () => {
    await dashboardPage.userMenuButton.click();
  });

  await test.step('Validate menu options are visible', async () => {
    await expect(dashboardPage.profileMenuItem).toBeVisible();
    await expect(dashboardPage.signOutMenuItem).toBeVisible();
  });
});
