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

test('dispatcher requests a BOL upload before the driver has submitted one', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA Request BOL ${Date.now()}`;
  const requestNote = 'Please upload the signed BOL as soon as you pick up.';
  let portalToken;

  await test.step('Dispatcher creates a load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-request-bol.example.com',
      rate: 1900,
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

  await test.step('Dispatcher opens the load and requests the BOL before any page is uploaded', async () => {
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await loadDetailPanelPage.requestDoc('bol', requestNote);

    // The dropdown item flips to a disabled "BOL request sent" state once
    // already requested — confirm the request actually registered.
    await loadDetailPanelPage.driverLinkActionsButton.click();
    await expect(loadDetailPanelPage.docRequestSentMenuItem('bol')).toBeVisible();
    await expect(loadDetailPanelPage.docRequestSentMenuItem('bol')).toBeDisabled();
    await page.keyboard.press('Escape');
  });

  await test.step('Driver sees the request banner and uploads the BOL', async () => {
    const driverContext = await browser.newContext();
    const driverPage = await driverContext.newPage();
    const driverPortalPage = new DriverPortalPage(driverPage);
    try {
      await driverPortalPage.gotoToken(portalToken);

      const banner = driverPortalPage.feedbackItem('Dispatch requested BOL upload');
      await expect(banner).toBeVisible();
      await expect(banner).toContainText(requestNote);

      await driverPortalPage.uploadDoc('bol', {
        name: 'bol-page-1.png',
        mimeType: 'image/png',
        buffer: ONE_PIXEL_PNG,
      });
      await expect(driverPortalPage.docToast).toHaveText('BOL page uploaded successfully');
    } finally {
      await driverContext.close();
    }
  });

  await test.step('Dispatcher reloads and sees the BOL awaiting review, request cleared', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await expect(loadDetailPanelPage.docBadge('bol')).toHaveAttribute('title', 'Pending review');
  });
});
