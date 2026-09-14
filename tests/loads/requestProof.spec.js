// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { CreateLoadPage } from '../../pages/CreateLoadPage';
import { DriverPortalPage } from '../../pages/DriverPortalPage';
import { LoadDetailPanelPage } from '../../pages/LoadDetailPanelPage';
import { DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

test('dispatcher requests proof for a cost the driver submitted without one', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA Request Proof ${Date.now()}`;
  const facilityName = 'QA Pickup Dock';
  const requestNote = 'Please send a clear photo of the lumper receipt.';
  let portalToken;

  await test.step('Dispatcher creates a load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-request-proof.example.com',
      rate: 2100,
    });
    await createLoadPage.goNext();
    await createLoadPage.selectDriverByName('Derrick Miles');
    await createLoadPage.goNext();
    await createLoadPage.fillStop(0, {
      facilityName,
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

  await test.step('Driver checks in and adds a Lumper cost with no proof', async () => {
    const driverContext = await browser.newContext();
    const driverPage = await driverContext.newPage();
    const driverPortalPage = new DriverPortalPage(driverPage);
    try {
      await driverPortalPage.gotoToken(portalToken);
      await driverPortalPage.stopActionButton(0).click();
      await expect(driverPortalPage.checkedInBadge(0)).toBeVisible();

      await driverPortalPage.addCostButton(0).click();
      await driverPortalPage.costTypeButton('Lumper').click();
      await driverPortalPage.addCostContinueButton.click();
      await driverPortalPage.addCostNoteInput.fill('Lumper fee, forgot to snap a photo at the dock.');
      await driverPortalPage.addCostSubmitButton(facilityName).click();

      await expect(driverPortalPage.stop(0)).toContainText('Lumper');
    } finally {
      await driverContext.close();
    }
  });

  await test.step('Dispatcher reloads, opens the load, and requests proof', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await expect(loadDetailPanelPage.panel).toContainText('Lumper');
    await loadDetailPanelPage.requestProof(requestNote);

    // requestProof flips the cost's status from pending_approval to
    // needs_action server-side — confirm the panel reflects it.
    await expect(loadDetailPanelPage.panel.getByText('Needs driver action', { exact: true })).toBeVisible();
  });

  await test.step('Driver sees the request banner and adds the requested proof', async () => {
    const driverContext = await browser.newContext();
    const driverPage = await driverContext.newPage();
    const driverPortalPage = new DriverPortalPage(driverPage);
    try {
      await driverPortalPage.gotoToken(portalToken);

      const banner = driverPortalPage.feedbackItem('Dispatch needs proof for Lumper');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(requestNote);

      // Clicking the banner expands the cost's inline editor directly.
      await banner.click();
      await driverPortalPage.addProofToExpandedCost({
        name: 'lumper-receipt-requested.png',
        mimeType: 'image/png',
        buffer: ONE_PIXEL_PNG,
      });

      // Saving successfully collapses the editor and clears the request —
      // the banner should be gone.
      await expect(banner).toHaveCount(0);
    } finally {
      await driverContext.close();
    }
  });

  await test.step('Dispatcher reloads and sees the cost back at pending approval with proof attached', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await expect(loadDetailPanelPage.panel.getByText('Pending approval', { exact: true })).toBeVisible();
    await expect(loadDetailPanelPage.proofThumbnail('Lumper')).toBeVisible();
  });
});
