// @ts-check
// Opt-in: this test performs a real supabase.auth.signUp call against the
// hosted Supabase project and leaves behind a permanently-unconfirmed user
// on every run. Run deliberately (e.g. `npx playwright test registerSignup`),
// not as part of the default suite, until a cleanup mechanism exists.
import { test, expect } from '@playwright/test';
import { RegisterPage } from '../../pages/RegisterPage';

test('successful registration shows the confirm-your-email screen', async ({ page }) => {
  const registerPage = new RegisterPage(page);
  const uniqueEmail = `qa+${Date.now()}@transact.local`;

  await test.step('Open register page', async () => {
    await registerPage.goto();
  });

  await test.step('Submit a valid registration', async () => {
    await registerPage.register({
      firstName: 'QA',
      lastName: 'Tester',
      email: uniqueEmail,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      orgName: 'QA Test Org',
    });
  });

  await test.step('Validate confirm-your-email screen is shown', async () => {
    await expect(registerPage.confirmationHeading).toBeVisible();
  });
});
