import { expect, type Locator, type Page } from '@playwright/test';

// Shared behavior for Lightning object list pages: open the list, open the New form,
// fill lookups and picklists, and save with the re-click guard used by the other pages.
export class ObjectListPage {
  constructor(
    protected readonly page: Page,
    protected readonly objectApiName: string,
  ) {}

  async open(): Promise<void> {
    await this.page.goto(`/lightning/o/${this.objectApiName}/list`, { waitUntil: 'domcontentloaded' });
    await expect(this.newButton()).toBeVisible({ timeout: 30000 });
  }

  protected newButton(): Locator {
    return this.page.getByRole('button', { name: 'New', exact: true });
  }

  // Scope to the form modal by title: duplicate-rule warnings also render as role="dialog".
  protected async openForm(title: string): Promise<Locator> {
    await this.newButton().click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: title }).first();
    // Quick-action modals can take a few seconds to render their title.
    await expect(dialog).toBeVisible({ timeout: 20000 });
    return dialog;
  }

  protected async fillInput(dialog: Locator, label: string, value: string): Promise<void> {
    // Required fields carry a leading asterisk in their accessible name ("*Opportunity Name").
    await dialog.getByLabel(new RegExp(`^\\*?\\s*${label}$`)).fill(value);
  }

  protected async pickOption(dialog: Locator, label: string, option: string): Promise<void> {
    // Some picklists render as a combobox; Campaign Status renders as a button named "Status <value>".
    const combobox = dialog.getByRole('combobox', { name: label });
    const trigger =
      (await combobox.count()) > 0 ? combobox : dialog.getByRole('button', { name: new RegExp(`^${label}\\b`) });
    await trigger.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  protected async fillLookup(dialog: Locator, label: string, recordName: string): Promise<void> {
    const lookup = dialog.getByRole('combobox', { name: label });
    // "Recently Viewed" lists a just-created record immediately; typed search can lag behind indexing.
    const option = this.page
      .getByRole('option', { name: recordName })
      .filter({ hasNotText: /show all results/i })
      .first();
    let attempt = 0;
    await expect(async () => {
      // Clicking an already-open combobox closes it, so only open it when no option is showing.
      if (!(await option.isVisible())) {
        await lookup.click();
        if (attempt++ > 0) {
          await lookup.fill('');
          await lookup.pressSequentially(recordName, { delay: 30 });
        }
      }
      await expect(option).toBeVisible({ timeout: 6000 });
      await option.click({ force: true, timeout: 6000 });
    }).toPass({ timeout: 45000 });
    // Some lookups (e.g. Task's polymorphic "Name" field) replace the combobox with a selected-
    // record chip once filled, so it may no longer exist; only check it when it's still there.
    if (await lookup.count() > 0) {
      await expect(lookup).not.toHaveAttribute('aria-invalid', 'true');
    }
  }

  // Lightning can swallow a Save click that lands before the form finishes rendering,
  // so only re-click while the dialog is still open.
  protected async saveUntilRecordPage(dialog: Locator, urlPattern: RegExp): Promise<void> {
    await expect(async () => {
      if (await dialog.isVisible()) {
        await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      }
      await expect(this.page).toHaveURL(urlPattern, { timeout: 8000 });
    }).toPass({ timeout: 40000 });
  }
}
