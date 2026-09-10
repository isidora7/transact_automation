// @ts-check
import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/RegisterPage';

test('mismatched passwords show a hint and block submission', async ({ page }) => {
  const registerPage = new RegisterPage(page);

  await test.step('Open register page', async () => {
    await registerPage.goto();
  });

  await test.step('Fill form with mismatched passwords', async () => {
    await registerPage.firstNameInput.fill('Test');
    await registerPage.lastNameInput.fill('User');
    await registerPage.emailInput.fill('mismatch@transact.local');
    await registerPage.passwordInput.fill('Password123!');
    await registerPage.confirmPasswordInput.fill('Password456!');
    await registerPage.orgNameInput.fill('Test Org');
  });

  await test.step('Validate mismatch hint and disabled submit', async () => {
    await expect(registerPage.passwordMismatchHint).toBeVisible();
    await expect(registerPage.submitButton).toBeDisabled();
  });
});

test('organisation name under 2 characters blocks submission', async ({ page }) => {
  const registerPage = new RegisterPage(page);

  await test.step('Open register page', async () => {
    await registerPage.goto();
  });

  await test.step('Fill form with a too-short organisation name', async () => {
    await registerPage.firstNameInput.fill('Test');
    await registerPage.lastNameInput.fill('User');
    await registerPage.emailInput.fill('shortorg@transact.local');
    await registerPage.passwordInput.fill('Password123!');
    await registerPage.confirmPasswordInput.fill('Password123!');
    await registerPage.orgNameInput.fill('T');
  });

  await test.step('Validate submit stays disabled', async () => {
    await expect(registerPage.submitButton).toBeDisabled();
  });
});
