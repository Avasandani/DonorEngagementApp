import { expect, type Page } from '@playwright/test';

export class AccountListPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/lightning/o/Account/list', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('button', { name: 'New', exact: true })).toBeVisible({ timeout: 30000 });
  }

  async createAccount(accountName: string): Promise<void> {
    await this.page.getByRole('button', { name: 'New', exact: true }).click();

    const dialog = this.page.getByRole('dialog');
    // Quick-action modals can take a few seconds to render their title.
    await expect(dialog).toBeVisible({ timeout: 20000 });

    const nameField = dialog.locator(
      'input[title*="Account Name" i], ' +
      'input[aria-label*="Account Name" i], ' +
      'input[placeholder*="Account Name" i], ' +
      'input[name="Name"], ' +
      'textarea[title*="Account Name" i], ' +
      'textarea[aria-label*="Account Name" i]',
    ).first();

    await expect(nameField).toBeVisible({ timeout: 15000 });
    await nameField.fill(accountName);

    // Lightning can swallow a Save click that lands before the form finishes rendering,
    // so only re-click while the dialog is still open.
    await expect(async () => {
      if (await dialog.isVisible()) {
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      }
      await expect(this.page).toHaveURL(/\/lightning\/r\/(Account\/)?001\w+\/view/, { timeout: 8000 });
    }).toPass({ timeout: 40000 });
    await expect(this.page.locator('body')).toContainText(accountName, { timeout: 15000 });
  }
}