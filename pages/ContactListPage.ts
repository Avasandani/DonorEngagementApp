import { expect, type Page } from '@playwright/test';

export interface NewContact {
  firstName: string;
  lastName: string;
  email?: string;
  title?: string;
  accountName: string;
}

export class ContactListPage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/lightning/o/Contact/list', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('button', { name: 'New', exact: true })).toBeVisible({ timeout: 30000 });
  }

  async createContact(contact: NewContact): Promise<void> {
    await this.page.getByRole('button', { name: 'New', exact: true }).click();

    // Scope to the form modal: duplicate-rule warnings also render as role="dialog".
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'New Contact' }).first();
    // Quick-action modals can take a few seconds to render their title.
    await expect(dialog).toBeVisible({ timeout: 20000 });

    await dialog.getByPlaceholder('First Name').fill(contact.firstName);
    await dialog.getByPlaceholder('Last Name').fill(contact.lastName);
    if (contact.email) await dialog.getByLabel('Email', { exact: true }).fill(contact.email);
    if (contact.title) await dialog.getByLabel('Title', { exact: true }).fill(contact.title);

    const accountLookup = dialog.getByRole('combobox', { name: 'Account Name' });
    // A just-created Account is in "Recently Viewed" immediately, whereas search results can lag
    // behind indexing (and the first search row is "Show All Results", which also matches the name).
    const accountOption = this.page
      .getByRole('option', { name: contact.accountName })
      .filter({ hasNotText: /show all results/i })
      .first();
    let attempt = 0;
    await expect(async () => {
      // Clicking an already-open combobox closes it, so only open it when no option is showing.
      if (!(await accountOption.isVisible())) {
        await accountLookup.click();
        if (attempt++ > 0) {
          await accountLookup.fill('');
          await accountLookup.pressSequentially(contact.accountName, { delay: 30 });
        }
      }
      await expect(accountOption).toBeVisible({ timeout: 6000 });
      // The option re-renders while the list settles, so skip the stability wait.
      await accountOption.click({ force: true, timeout: 6000 });
    }).toPass({ timeout: 45000 });
    await expect(accountLookup).not.toHaveAttribute('aria-invalid', 'true');

    await expect(async () => {
      if (await dialog.isVisible()) {
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      }
      await expect(this.page).toHaveURL(/\/lightning\/r\/(Contact\/)?003\w+\/view/, { timeout: 8000 });
    }).toPass({ timeout: 40000 });
  }
}
