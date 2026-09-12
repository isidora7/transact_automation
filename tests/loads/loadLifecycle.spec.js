// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { CreateLoadPage } from '../../pages/CreateLoadPage';
import { DriverPortalPage } from '../../pages/DriverPortalPage';
import { LoadDetailPanelPage } from '../../pages/LoadDetailPanelPage';
import { DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

async function createLoad(page, { customerName, customerEmail }) {
  const createLoadPage = new CreateLoadPage(page);
  await createLoadPage.open();
  await createLoadPage.fillDetails({ customerName, customerEmail, rate: 1900 });
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
}

async function getPortalToken(page, context, customerName) {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const loadCard = page.locator('.load-card').filter({ hasText: customerName });
  await loadCard.getByTitle('Copy portal link').click();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  const match = clipboardText.match(/\/d\/([^/]+)$/);
  expect(match, `expected a portal URL in the clipboard, got: ${clipboardText}`).not.toBeNull();
  return match[1];
}

test('dispatcher cancels an active load', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  const customerName = `QA Cancel ${Date.now()}`;

  await test.step('Create a load', async () => {
    await dashboardPage.goto();
    await createLoad(page, { customerName, customerEmail: 'dispatch@qa-cancel.example.com' });
  });

  await test.step('Cancel it from the detail panel', async () => {
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();
    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await loadDetailPanelPage.cancelLoad();
    await expect(loadDetailPanelPage.panel.getByText('Cancelled', { exact: true })).toBeVisible();
    // Cancelling deactivates the portal, which hides the whole footer —
    // neither lifecycle button should still be there to click again.
    await expect(loadDetailPanelPage.cancelLoadButton).toHaveCount(0);
    await expect(loadDetailPanelPage.completeLoadButton).toHaveCount(0);
  });

  await test.step('Load now shows under the Cancelled tab', async () => {
    await page.getByRole('tab', { name: 'Cancelled' }).click();
    await expect(page.locator('.load-card').filter({ hasText: customerName })).toBeVisible();
  });
});

// KNOWN APP BUG (confirmed 2026-09-12, reported to the user, not yet fixed):
// exTransact's mapLoadRow() (src/server/services/load.service.ts:61-63) does
// `row.current_stop_index ?? (status === "active" ? firstStopIndex(stops) : null)`.
// New loads are created with current_stop_index: 0, never null, so the only
// way it's genuinely null is the checkout-of-the-last-stop transition, which
// means "all stops done, ready to complete" — but this fallback silently
// resets that back to the first stop. Confirmed via direct DB query: the
// database correctly holds current_stop_index: null after both stops are
// checked out, but the dashboard still shows "Complete" disabled because it
// reads through this buggy mapper. This test asserts the CORRECT behavior on
// purpose and will keep failing until that mapper is fixed — that failure is
// the point: it's a live regression guard, not a flaky/broken test.
test('dispatcher completes a load once all stops are checked out', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const customerName = `QA Complete ${Date.now()}`;
  let portalToken;

  await test.step('Create a load and copy its portal link', async () => {
    await dashboardPage.goto();
    await createLoad(page, { customerName, customerEmail: 'dispatch@qa-complete.example.com' });
    portalToken = await getPortalToken(page, context, customerName);
  });

  const driverContext = await browser.newContext();
  const driverPage = await driverContext.newPage();
  const driverPortalPage = new DriverPortalPage(driverPage);

  try {
    await test.step('Driver checks in and out at both stops', async () => {
      await driverPortalPage.gotoToken(portalToken);

      await driverPortalPage.stopActionButton(0).click();
      await expect(driverPortalPage.checkedInBadge(0)).toBeVisible();
      await driverPortalPage.stopActionButton(0).click();
      await expect(driverPortalPage.checkedOutBadge(0)).toBeVisible();

      await driverPortalPage.stopActionButton(1).click();
      await expect(driverPortalPage.checkedInBadge(1)).toBeVisible();
      await driverPortalPage.stopActionButton(1).click();
      await expect(driverPortalPage.checkedOutBadge(1)).toBeVisible();
    });
  } finally {
    await driverContext.close();
  }

  await test.step('Dispatcher reloads, opens the load, and completes it', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await expect(loadDetailPanelPage.completeLoadButton).toBeEnabled();
    await loadDetailPanelPage.completeLoad();
    await expect(loadDetailPanelPage.panel.getByText('Completed', { exact: true })).toBeVisible();
  });

  await test.step('Load now shows under the Completed tab', async () => {
    await page.getByRole('tab', { name: 'Completed' }).click();
    await expect(page.locator('.load-card').filter({ hasText: customerName })).toBeVisible();
  });
});
