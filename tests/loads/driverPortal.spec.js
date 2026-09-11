// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { CreateLoadPage } from '../../pages/CreateLoadPage';
import { DriverPortalPage } from '../../pages/DriverPortalPage';
import { DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

// The load is created as the dispatcher, but the portal itself is an
// unauthenticated, token-based route a driver opens with no session at all —
// see the fresh browser context opened below for that half of the test.
test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

test('driver checks in and out at the first stop via the portal link', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA Portal ${Date.now()}`;
  let portalToken;

  await test.step('Dispatcher creates a load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-portal.example.com',
      rate: 1800,
    });
    await createLoadPage.goNext();
    await createLoadPage.selectDriverByName('Derrick Miles');
    await createLoadPage.goNext();
    await createLoadPage.fillStop(0, {
      facilityName: 'QA Pickup Dock',
      address: '1 Dock Rd',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      date: '2026-10-05',
      time: '09:00',
    });
    await createLoadPage.fillStop(1, {
      facilityName: 'QA Drop Dock',
      address: '2 Dock Rd',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      date: '2026-10-06',
      time: '15:00',
    });
    await createLoadPage.goNext();
    await createLoadPage.submit();
  });

  await test.step('Copy the portal link from the new load card', async () => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.getByTitle('Copy portal link').click();
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    const match = clipboardText.match(/\/d\/([^/]+)$/);
    expect(match, `expected a portal URL in the clipboard, got: ${clipboardText}`).not.toBeNull();
    portalToken = match[1];
  });

  // A driver never logs in — open a brand-new, storageState-less context so
  // this half of the test can't accidentally ride on the dispatcher's session.
  const driverContext = await browser.newContext();
  const driverPage = await driverContext.newPage();
  const driverPortalPage = new DriverPortalPage(driverPage);

  try {
    await test.step('Driver opens the portal link with no login', async () => {
      await driverPortalPage.gotoToken(portalToken);
      await expect(driverPortalPage.customerHeading).toHaveText(customerName);
    });

    await test.step('Driver checks in at the first stop', async () => {
      await expect(driverPortalPage.stopActionButton(0)).toHaveText('Check in');
      await driverPortalPage.stopActionButton(0).click();
      await expect(driverPortalPage.checkedInBadge(0)).toBeVisible();
      await expect(driverPortalPage.stopActionButton(0)).toHaveText('Check out');
    });

    await test.step('Driver checks out at the first stop', async () => {
      await driverPortalPage.stopActionButton(0).click();
      await expect(driverPortalPage.checkedOutBadge(0)).toBeVisible();
    });
  } finally {
    await driverContext.close();
  }
});
