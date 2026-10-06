import type { Locator, Page } from '@playwright/test';

export class SalesforceRecordPage {
  constructor(
    protected readonly page: Page,
    private readonly objectApiName: string,
  ) {}

  async open(recordId: string): Promise<void> {
    await this.page.goto(`/lightning/r/${this.objectApiName}/${recordId}/view`);
  }

  async fillField(fieldLabel: string, value: string): Promise<void> {
    await this.page.getByLabel(fieldLabel, { exact: true }).fill(value);
  }

  async save(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save', exact: true }).click();
  }

  async getFieldValue(fieldLabel: string): Promise<string> {
    const field: Locator = this.page.getByLabel(fieldLabel, { exact: true });
    try {
      return await field.inputValue();
    } catch {
      return (await field.textContent())?.trim() ?? '';
    }
  }

  async openRelatedListNewRecord(relatedListName: string): Promise<void> {
    const relatedListHeading = this.page.getByRole('heading', {
      name: relatedListName,
      exact: false,
    });
    const relatedList = relatedListHeading.locator('xpath=ancestor::*[.//button][1]');
    await relatedList.getByRole('button', { name: 'New', exact: true }).click();
  }
}