// @ts-check
import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/RegisterPage';

test('smoke: register page shows all fields and sign-in link', async ({ page }) => {
  const registerPage = new RegisterPage(page);

  await test.step('Open register page', async () => {
    await registerPage.goto();
  });

  await test.step('Validate register form fields', async () => {
    await expect(registerPage.firstNameInput).toBeVisible();
    await expect(registerPage.lastNameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.orgNameInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  await test.step('Validate sign-in link is present', async () => {
    await expect(registerPage.signInLink).toBeVisible();
  });
});
