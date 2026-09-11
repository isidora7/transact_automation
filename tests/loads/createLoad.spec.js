// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { CreateLoadPage } from '../../pages/CreateLoadPage';
import { DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

// Only dispatchers can create loads (admins see the board read-only), so this
// whole spec runs as the dispatcher.
test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

test('dispatcher creates a load through the 4-step wizard', async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  const createLoadPage = new CreateLoadPage(page);
  const customerName = `QA Customer ${Date.now()}`;

  await test.step('Open dashboard and start Create Load', async () => {
    await dashboardPage.goto();
    await createLoadPage.open();
  });

  await test.step('Fill Details step', async () => {
    await createLoadPage.fillDetails({
      customerName,
      customerEmail: 'dispatch@qa-customer.example.com',
      rate: 2500,
    });
    await createLoadPage.goNext();
  });

  await test.step('Fill Assignment step (driver autofills unit/trailer)', async () => {
    await createLoadPage.selectDriverByName('Derrick Miles');
    await expect(createLoadPage.unitNumberInput).toHaveValue('TX-4102');
    await expect(createLoadPage.trailerNumberInput).toHaveValue('TR-8821');
    await createLoadPage.goNext();
  });

  await test.step('Fill Stops step (one pickup, one drop)', async () => {
    await createLoadPage.fillStop(0, {
      facilityName: 'QA Warehouse A',
      address: '123 Market St',
      city: 'Houston',
      state: 'TX',
      zip: '77001',
      date: '2026-10-01',
      time: '08:00',
    });
    await createLoadPage.fillStop(1, {
      facilityName: 'QA Warehouse B',
      address: '456 Elm St',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      date: '2026-10-02',
      time: '14:00',
    });
    await createLoadPage.goNext();
  });

  await test.step('Review and submit', async () => {
    await expect(createLoadPage.reviewHeading).toBeVisible();
    await expect(createLoadPage.dialog).toContainText(customerName);
    await createLoadPage.submit();
  });

  await test.step('Validate the load appears on the dashboard', async () => {
    await expect(createLoadPage.dialog).not.toBeVisible();
    const loadCard = page.locator('.load-card').filter({ hasText: customerName });
    await expect(loadCard).toBeVisible();
    await expect(loadCard).toContainText('TX-4102');
  });
});
