import { expect, test } from '@playwright/test';
import { uniqueEmail, uniqueName } from '../fixtures/testData';
import { AccountListPage } from '../pages/AccountListPage';
import { ContactListPage } from '../pages/ContactListPage';

test('creates a Contact linked to an Account', async ({ page }) => {
  const accountName = uniqueName('Demo University');
  const firstName = 'Priya';
  const lastName = uniqueName('Alumna');

  const accountListPage = new AccountListPage(page);
  await accountListPage.open();
  await accountListPage.createAccount(accountName);

  const contactListPage = new ContactListPage(page);
  await contactListPage.open();
  await contactListPage.createContact({
    firstName,
    lastName,
    email: uniqueEmail('priya.alumna'),
    title: 'Alumna',
    accountName,
  });

  await expect(page.getByRole('heading', { name: `Contact ${firstName} ${lastName}` })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('link', { name: accountName }).first()).toBeVisible({ timeout: 15000 });
});
