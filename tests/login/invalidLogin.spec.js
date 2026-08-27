// @ts-check
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test('invalid login: wrong password shows an error and stays on login', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Open app', async () => {
    await loginPage.goto();
  });

  await test.step('Submit valid email with wrong password', async () => {
    await loginPage.emailInput.fill(process.env.TEST_ADMIN_EMAIL);
    await loginPage.passwordInput.fill('wrong-password-123');
    await loginPage.loginButton.click();
  });

  await test.step('Validate error is shown and user stays on login', async () => {
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText('Invalid login credentials');
    await expect(page).toHaveURL(/\/login/);
  });
});

test('invalid login: empty fields block submission natively', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await test.step('Open app', async () => {
    await loginPage.goto();
  });

  await test.step('Submit with empty email and password', async () => {
    // The app pre-fills email with a dev-mode default, so clear it explicitly
    // rather than relying on the field starting empty.
    await loginPage.emailInput.fill('');
    await loginPage.loginButton.click();
  });

  await test.step('Validate the browser blocks submission via required fields', async () => {
    await expect(page).toHaveURL(/\/login/);
    const emailIsValid = await loginPage.emailInput.evaluate(
      /** @param {HTMLInputElement} el */ (el) => el.validity.valid,
    );
    expect(emailIsValid).toBe(false);
  });
});
