// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { CreateLoadPage } from '../../pages/CreateLoadPage';
import { DriverPortalPage } from '../../pages/DriverPortalPage';
import { LoadDetailPanelPage } from '../../pages/LoadDetailPanelPage';
import { DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

// A minimal but valid 1x1 transparent PNG — same fixture-free approach as
// bolPodReview.spec.js; the upload endpoint doesn't validate image content.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

test('rejected BOL returns to pending after the driver re-uploads a page', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA BOL Resubmit ${Date.now()}`;
  let portalToken;

  await test.step('Dispatcher creates a load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-bol-resubmit.example.com',
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

  await test.step('Driver uploads an initial BOL page', async () => {
    const driverContext = await browser.newContext();
    const driverPage = await driverContext.newPage();
    const driverPortalPage = new DriverPortalPage(driverPage);
    try {
      await driverPortalPage.gotoToken(portalToken);
      await driverPortalPage.uploadDoc('bol', {
        name: 'bol-page-1-blurry.png',
        mimeType: 'image/png',
        buffer: ONE_PIXEL_PNG,
      });
      await expect(driverPortalPage.docToast).toHaveText('BOL page uploaded successfully');
    } finally {
      await driverContext.close();
    }
  });

  await test.step('Dispatcher reloads, opens the load, and rejects the BOL with a note', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await loadDetailPanelPage.rejectDoc('bol', 'Page is blurry, please retake and re-upload.');
    // The badge's status lives in its title/aria-label, not its visible text
    // (which is always just "BOL") — assert the attribute, not text content.
    await expect(loadDetailPanelPage.docBadge('bol')).toHaveAttribute('title', 'Needs review');
  });

  await test.step('Driver sees the rejection note and re-uploads a clearer page', async () => {
    const driverContext = await browser.newContext();
    const driverPage = await driverContext.newPage();
    const driverPortalPage = new DriverPortalPage(driverPage);
    try {
      await driverPortalPage.gotoToken(portalToken);
      await expect(driverPortalPage.docRejectionNote).toContainText(
        'Page is blurry, please retake and re-upload.',
      );

      await driverPortalPage.uploadDoc('bol', {
        name: 'bol-page-1-clear.png',
        mimeType: 'image/png',
        buffer: ONE_PIXEL_PNG,
      });
      await expect(driverPortalPage.docToast).toHaveText('BOL page uploaded successfully');
    } finally {
      await driverContext.close();
    }
  });

  await test.step('Dispatcher reloads and sees the BOL back at pending review', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await expect(loadDetailPanelPage.docBadge('bol')).toHaveAttribute('title', 'Pending review');

    await loadDetailPanelPage.openDocPreview('bol');
    await expect(loadDetailPanelPage.docPreviewDialog).not.toContainText(
      'Page is blurry, please retake and re-upload.',
    );
    await expect(loadDetailPanelPage.docPreviewApproveButton).toBeVisible();
    await expect(loadDetailPanelPage.docPreviewRejectButton).toBeVisible();
  });

  await test.step('Dispatcher approves the resubmitted BOL', async () => {
    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await loadDetailPanelPage.docPreviewApproveButton.click();
    await expect(loadDetailPanelPage.docPreviewApproveButton).toHaveCount(0);
    await expect(loadDetailPanelPage.docPreviewRejectButton).toHaveCount(0);
    // The preview dialog stays open after approving (only reject auto-closes
    // it) and, being a modal, hides the panel behind it from the a11y tree —
    // so assert the status on the still-open dialog itself, not the
    // background panel badge.
    await expect(loadDetailPanelPage.docPreviewDialog).toContainText('Approved');
  });
});
