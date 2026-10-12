import { expect, type Page } from '@playwright/test';
import { ObjectListPage } from './ObjectListPage';

export interface NewOpportunity {
  name: string;
  accountName: string;
  stage: string;
  closeDate: string; // MM/DD/YYYY, as typed into the Lightning date field
  amount?: string;
  campaignName?: string;
}

export class OpportunityListPage extends ObjectListPage {
  constructor(page: Page) {
    super(page, 'Opportunity');
  }

  async createOpportunity(opportunity: NewOpportunity): Promise<void> {
    const dialog = await this.openForm('New Opportunity');
    await this.fillInput(dialog, 'Opportunity Name', opportunity.name);
    await this.fillLookup(dialog, 'Account Name', opportunity.accountName);
    await this.pickOption(dialog, 'Stage', opportunity.stage);
    await this.fillInput(dialog, 'Close Date', opportunity.closeDate);
    if (opportunity.amount) await this.fillInput(dialog, 'Amount', opportunity.amount);
    if (opportunity.campaignName) await this.fillLookup(dialog, 'Campaign', opportunity.campaignName);
    await this.saveUntilRecordPage(dialog, /\/lightning\/r\/(Opportunity\/)?006\w+\/view/);
    await expect(this.page.locator('body')).toContainText(opportunity.name, { timeout: 15000 });
  }
}
