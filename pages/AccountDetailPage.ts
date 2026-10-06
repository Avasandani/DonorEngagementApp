import type { Locator, Page } from '@playwright/test';
import { SalesforceRecordPage } from './SalesforceRecordPage';

export class AccountDetailPage extends SalesforceRecordPage {
  constructor(page: Page) {
    super(page, 'Account');
  }

  nameText(accountName: string): Locator {
    return this.page.getByText(accountName, { exact: true }).first();
  }
}