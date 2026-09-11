// @ts-check
import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { CreateLoadPage } from '../../pages/CreateLoadPage';
import { DISPATCHER_ONE_STORAGE_STATE } from '../authStorage';

test.use({ storageState: DISPATCHER_ONE_STORAGE_STATE });

test.beforeEach(async ({ page }) => {
  const dashboardPage = new DashboardPage(page);
  await dashboardPage.goto();
  const createLoadPage = new CreateLoadPage(page);
  await createLoadPage.open();
});

test('Details step blocks on missing/invalid fields, one rule at a time', async ({ page }) => {
  const createLoadPage = new CreateLoadPage(page);

  await test.step('Empty form: customer name required', async () => {
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Customer name is required.');
  });

  await test.step('Name filled, no email: customer email required', async () => {
    await createLoadPage.customerNameInput.fill('QA Customer');
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Customer email is required.');
  });

  await test.step('Malformed email: rejected', async () => {
    await createLoadPage.customerEmailInput.fill('not-an-email');
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Enter a valid customer email.');
  });

  await test.step('Valid email, no rate: rate required', async () => {
    await createLoadPage.customerEmailInput.fill('dispatch@qa-customer.example.com');
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Rate must be a positive number.');
  });

  await test.step('Zero rate: still rejected (must be positive)', async () => {
    await createLoadPage.rateInput.fill('0');
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Rate must be a positive number.');
  });

  await test.step('Valid rate: advances to Assignment step', async () => {
    await createLoadPage.rateInput.fill('2500');
    await createLoadPage.goNext();
    await expect(createLoadPage.driverSelect).toBeVisible();
  });
});

test('Assignment step blocks on missing driver and missing unit number', async ({ page }) => {
  const createLoadPage = new CreateLoadPage(page);

  await test.step('Reach Assignment step', async () => {
    await createLoadPage.fillDetails({
      customerName: 'QA Customer',
      customerEmail: 'dispatch@qa-customer.example.com',
      rate: 2500,
    });
    await createLoadPage.goNext();
  });

  await test.step('No driver selected: blocked', async () => {
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Select a driver before creating a load.');
  });

  await test.step('Driver selected but unit number cleared: blocked', async () => {
    await createLoadPage.selectDriverByName('Derrick Miles');
    await expect(createLoadPage.unitNumberInput).toHaveValue('TX-4102'); // autofilled
    await createLoadPage.unitNumberInput.fill('');
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Unit number is required.');
  });

  await test.step('Unit number restored: advances to Stops step', async () => {
    await createLoadPage.unitNumberInput.fill('TX-4102');
    await createLoadPage.goNext();
    await expect(createLoadPage.stopField(0, 'facility')).toBeVisible();
  });
});

test('Stops step enforces pickup/drop coverage and per-stop field rules', async ({ page }) => {
  const createLoadPage = new CreateLoadPage(page);

  await test.step('Reach Stops step', async () => {
    await createLoadPage.fillDetails({
      customerName: 'QA Customer',
      customerEmail: 'dispatch@qa-customer.example.com',
      rate: 2500,
    });
    await createLoadPage.goNext();
    await createLoadPage.selectDriverByName('Derrick Miles');
    await createLoadPage.goNext();
  });

  await test.step('Both stops set to "drop": must include a pickup and a drop', async () => {
    await createLoadPage.stopTypeButton(0, 'drop').click();
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Include at least one pickup and one drop.');
  });

  await test.step('Restore stop 1 as pickup, still blank: facility name required', async () => {
    await createLoadPage.stopTypeButton(0, 'pickup').click();
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Stop 1 facility name is required.');
  });

  await test.step('Facility filled, bad state code: rejected', async () => {
    // The state input sanitizes on every keystroke (uppercase, letters only,
    // max 2 chars), so a full word like "Texas" silently becomes "TE" — a
    // valid-shaped code. Only a single letter survives sanitization as
    // genuinely too short.
    await createLoadPage.fillStop(0, {
      facilityName: 'QA Warehouse A',
      address: '123 Market St',
      city: 'Houston',
      state: 'T',
      zip: '77001',
      date: '2026-10-01',
      time: '08:00',
    });
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Stop 1 state must be a 2-letter code.');
  });

  await test.step('Valid state, bad ZIP: rejected', async () => {
    await createLoadPage.fillStop(0, { state: 'TX', zip: '770' });
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Stop 1 ZIP must be 5 digits.');
  });

  await test.step('Valid stop 1, stop 2 still blank: advances to its own required-field error', async () => {
    await createLoadPage.fillStop(0, { zip: '77001' });
    await createLoadPage.goNext();
    await expect(createLoadPage.errorMessage).toHaveText('Stop 2 facility name is required.');
  });

  await test.step('Both stops valid: advances to Review', async () => {
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
    await expect(createLoadPage.reviewHeading).toBeVisible();
  });
});
