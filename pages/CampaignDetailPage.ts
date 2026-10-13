import { expect, type Page } from '@playwright/test';

// Operates on the Campaign record page the browser is already on (after createCampaign).
export class CampaignDetailPage {
  constructor(private readonly page: Page) {}

  async addContactAsMember(contactName: string): Promise<void> {
    const addButton = this.page.getByRole('button', { name: /^Add .*(Contact|Member)/i }).first();
    await addButton.click();

    const dialog = this.page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();
    // Search the contact, tick its row, then step through the dialog's Next/submit buttons.
    const search = dialog.getByRole('combobox', { name: /^Search/ });
    // Row checkboxes read "Select item <First> <Last> <timestamp>", so match on the name only.
    const rowCheckbox = dialog.getByRole('checkbox', { name: new RegExp(`Select item .*${contactName}`) }).first();
    // The native input is covered by a styled overlay (slds-checkbox_faux); click that, not the
    // input - a direct force-click on the input is flaky and can register as a no-op click.
    // Enter sometimes opens a typeahead suggestion flyout instead of filtering the grid, leaving
    // the row unavailable, so retry the whole search until the row is actually checkable.
    await expect(async () => {
      if (!(await rowCheckbox.isVisible())) {
        await search.fill('');
        await search.fill(contactName);
        await search.press('Enter');
      }
      await rowCheckbox
        .locator('xpath=following-sibling::*[contains(@class, "slds-checkbox_faux")][1]')
        .click({ timeout: 6000 });
      await expect(rowCheckbox).toBeChecked({ timeout: 6000 });
    }).toPass({ timeout: 60000 });
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    await dialog.getByRole('button', { name: /^(Submit|Add|Save|Done)$/ }).first().click();
    await expect(this.page.getByRole('link', { name: contactName }).first()).toBeVisible({ timeout: 15000 });
  }

  // Count of rows in the Campaign Members related list that mention the contact.
  async memberRowCount(contactName: string): Promise<number> {
    return this.page.getByRole('row').filter({ hasText: contactName }).count();
  }
}
