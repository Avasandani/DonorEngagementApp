import { expect, test } from '@playwright/test';
import { AccountDetailPage } from '../pages/AccountDetailPage';
import { AccountListPage } from '../pages/AccountListPage';

test('creates an Account', async ({ page }) => {
  const accountName = 'Demo University';
  const accountListPage = new AccountListPage(page);

  await accountListPage.open();
  await accountListPage.createAccount(accountName);

  await expect(page).toHaveURL(/\/lightning\/r\/(Account\/)?001\w+\/view/);
  await expect(page.locator('body')).toContainText(accountName, { timeout: 15000 });
});