import { expect, type Page } from '@playwright/test';
import { ObjectListPage } from './ObjectListPage';

export interface NewCampaign {
  name: string;
  status?: string;
  expectedRevenue?: string;
}

export class CampaignListPage extends ObjectListPage {
  constructor(page: Page) {
    super(page, 'Campaign');
  }

  async createCampaign(campaign: NewCampaign): Promise<void> {
    const dialog = await this.openForm('New Campaign');
    await this.fillInput(dialog, 'Campaign Name', campaign.name);
    if (campaign.status) await this.pickOption(dialog, 'Status', campaign.status);
    if (campaign.expectedRevenue) await this.fillInput(dialog, 'Expected Revenue', campaign.expectedRevenue);
    await this.saveUntilRecordPage(dialog, /\/lightning\/r\/(Campaign\/)?701\w+\/view/);
    await expect(this.page.locator('body')).toContainText(campaign.name, { timeout: 15000 });
  }
}
