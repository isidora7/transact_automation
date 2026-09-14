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

test('dispatcher rejects a proof photo the driver attached to a cost, with a note', async ({ page, context, browser }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA Proof Rejection ${Date.now()}`;
  const facilityName = 'QA Pickup Dock';
  let portalToken;

  await test.step('Dispatcher creates a load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-proof-rejection.example.com',
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
      await driverPortalPage.addCostNoteInput.fill('Lumper fee, blurry receipt photo attached.');
      await driverPortalPage.addProofFiles({
        name: 'lumper-receipt-blurry.png',
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

  const rejectionNote = 'Receipt is illegible, please re-upload a clearer photo.';

  await test.step('Dispatcher rejects the proof photo with a note', async () => {
    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await expect(loadDetailPanelPage.panel).toContainText('Lumper');
    await loadDetailPanelPage.rejectProof('Lumper', rejectionNote);

    // The reject-note dialog closing confirms the mutation itself
    // succeeded — but the panel's own in-memory data does not reliably
    // pick up the change without a reload (the client-side cache here
    // isn't invalidated/refreshed the way approve's is — confirmed by
    // direct testing: even a 20s wait on the still-open dialog never
    // showed the update). Same "reload instead of trusting realtime"
    // pattern used everywhere else in this suite.
    await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0);
  });

  await test.step('Dispatcher reloads and confirms the rejection stuck', async () => {
    await page.reload();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await loadCard.click();

    const loadDetailPanelPage = new LoadDetailPanelPage(page);
    await loadDetailPanelPage.openProofPreview('Lumper');
    await expect(loadDetailPanelPage.proofPreviewDialog).toContainText(rejectionNote);

    // CostProofPreviewDialog always renders these buttons when onApprove/
    // onDecline are passed — it only *disables* them once the proof is no
    // longer pending (a manually reopened dialog, like this one, never
    // goes through the auto-close effect that removes them entirely after
    // an in-place approve/reject — see proofPhotoApproval.spec.js). Assert
    // disabled, not absent.
    await expect(loadDetailPanelPage.proofPreviewApproveButton).toBeDisabled();
    await expect(loadDetailPanelPage.proofPreviewRejectButton).toBeDisabled();
  });
});
