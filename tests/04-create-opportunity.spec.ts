import { expect, test } from '@playwright/test';
import { uniqueName } from '../fixtures/testData';
import { AccountListPage } from '../pages/AccountListPage';
import { CampaignListPage } from '../pages/CampaignListPage';
import { OpportunityListPage } from '../pages/OpportunityListPage';

test('creates an Opportunity linked to an Account and a Campaign', async ({ page }) => {
  const accountName = uniqueName('Demo University');
  const campaignName = uniqueName('Scholarship Appeal');
  const opportunityName = uniqueName('Gift');

  const accountListPage = new AccountListPage(page);
  await accountListPage.open();
  await accountListPage.createAccount(accountName);

  // Campaigns are a prerequisite for the lookup; create one through the Campaign list.
  const campaignListPage = new CampaignListPage(page);
  await campaignListPage.open();
  await campaignListPage.createCampaign({ name: campaignName, status: 'Planned' });

  const opportunityListPage = new OpportunityListPage(page);
  await opportunityListPage.open();
  await opportunityListPage.createOpportunity({
    name: opportunityName,
    accountName,
    stage: 'Prospecting',
    closeDate: '12/31/2026',
    amount: '2500',
    campaignName,
  });

  await expect(page).toHaveURL(/\/lightning\/r\/(Opportunity\/)?006\w+\/view/);
  await expect(page.getByText('2,500', { exact: false }).first()).toBeVisible({ timeout: 15000 });
});
