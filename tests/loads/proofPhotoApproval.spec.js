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

test('dispatcher approves a proof photo the driver attached to a cost', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA Proof Approval ${Date.now()}`;
  const facilityName = 'QA Pickup Dock';
  let portalToken;

  await test.step('Dispatcher creates a load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-proof-approval.example.com',
      rate: 2300,
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

  const driverContext = await browser.newContext();
  const driverPage = await driverContext.newPage();
  const driverPortalPage = new DriverPortalPage(driverPage);

  try {
    await test.step('Driver checks in and adds a Lumper cost with a proof photo', async () => {
      await driverPortalPage.gotoToken(portalToken);
      await driverPortalPage.stopActionButton(0).click();
      await expect(driverPortalPage.checkedInBadge(0)).toBeVisible();

      await driverPortalPage.addCostButton(0).click();
      await driverPortalPage.costTypeButton('Lumper').click();
      await driverPortalPage.addCostContinueButton.click();
      await driverPortalPage.addCostNoteInput.fill('Lumper fee, receipt photo attached.');
      await driverPortalPage.addProofFiles({
        name: 'lumper-receipt.png',
        mimeType: 'image/png',
        buffer: ONE_PIXEL_PNG,
      });
      await driverPortalPage.addCostSubmitButton(facilityName).click();

      await expect(driverPortalPage.stop(0)).toContainText('Lumper');
    });
  } finally {
    await driverContext.close();
  }

  await test.step('Dispatcher reloads and opens the load to see the pending proof', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();
  });

  await test.step('Dispatcher previews and approves the proof photo', async () => {
    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await expect(loadDetailPanelPage.panel).toContainText('Lumper');
    await loadDetailPanelPage.openProofPreview('Lumper');
    await expect(loadDetailPanelPage.proofPreviewDialog).toContainText('Lumper proof');
    await expect(loadDetailPanelPage.proofPreviewDialog.locator('img')).toBeVisible();
    await loadDetailPanelPage.proofPreviewApproveButton.click();

    // Approve/Reject only render while the proof is pending — their absence
    // (once the dialog auto-closes with no other pending proof to advance
    // to) confirms the status moved past "pending".
    await expect(loadDetailPanelPage.proofPreviewApproveButton).toHaveCount(0);
    await expect(loadDetailPanelPage.proofPreviewRejectButton).toHaveCount(0);
  });
});
