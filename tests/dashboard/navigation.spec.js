// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { OrganisationPage } from '../../pages/OrganisationPage';
import { ADMIN_STORAGE_STATE, DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

test.describe('admin', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('admin sees the Organisation nav link on the dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await test.step('Open dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Validate Organisation link is visible', async () => {
      await expect(dashboardPage.organisationNavLink).toBeVisible();
    });
  });

  test('admin can navigate to the Organisation page via the sidebar', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const organisationPage = new OrganisationPage(page);

    await test.step('Open dashboard', async () => {
      await dashboardPage.goto();
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
    const dashboardPage = new DashboardPage(page);

    await test.step('Open dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Open the user menu', async () => {
      await dashboardPage.userMenuButton.click();
    });

    await test.step('Validate menu options are visible', async () => {
      await expect(dashboardPage.profileMenuItem).toBeVisible();
      await expect(dashboardPage.signOutMenuItem).toBeVisible();
    });
  });
});

test.describe('dispatcher', () => {
  test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

  test('dispatcher does not see the Organisation nav link on the dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await test.step('Open dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Validate Organisation link is absent', async () => {
      await expect(dashboardPage.dashboardNavLink).toBeVisible();
      await expect(dashboardPage.organisationNavLink).toHaveCount(0);
    });
  });
});
