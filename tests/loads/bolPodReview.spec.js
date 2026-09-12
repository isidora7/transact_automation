// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { CreateLoadPage } from '../../pages/CreateLoadPage';
import { DriverPortalPage } from '../../pages/DriverPortalPage';
import { LoadDetailPanelPage } from '../../pages/LoadDetailPanelPage';
import { DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

// A minimal but valid 1x1 transparent PNG — the upload endpoint checks
// MIME type, size, and filename extension, not actual image content, so
// there's no need for a real fixture file on disk.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

test('dispatcher reviews and approves a BOL the driver uploaded', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA BOL Review ${Date.now()}`;
  let portalToken;

  await test.step('Dispatcher creates a load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-bol.example.com',
      rate: 2000,
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

  const driverContext = await browser.newContext();
  const driverPage = await driverContext.newPage();
  const driverPortalPage = new DriverPortalPage(driverPage);

  try {
    await test.step('Driver uploads a BOL page (no check-in required for documents)', async () => {
      await driverPortalPage.gotoToken(portalToken);
      await driverPortalPage.uploadDoc('bol', {
        name: 'bol-page-1.png',
        mimeType: 'image/png',
        buffer: ONE_PIXEL_PNG,
      });
      await expect(driverPortalPage.docToast).toHaveText('BOL page uploaded successfully');
    });
  } finally {
    await driverContext.close();
  }

  await test.step('Dispatcher reloads and opens the load', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();
  });

  await test.step('Dispatcher previews and approves the BOL', async () => {
    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await loadDetailPanelPage.openDocPreview('bol');
    await expect(loadDetailPanelPage.docPreviewDialog).toContainText('BOL Preview');
    await expect(loadDetailPanelPage.docPreviewDialog.locator('img')).toBeVisible();
    await loadDetailPanelPage.docPreviewApproveButton.click();

    // Approve/Reject only render while the doc is pending — their absence
    // confirms the status moved past "pending".
    await expect(loadDetailPanelPage.docPreviewApproveButton).toHaveCount(0);
    await expect(loadDetailPanelPage.docPreviewRejectButton).toHaveCount(0);
  });
});
