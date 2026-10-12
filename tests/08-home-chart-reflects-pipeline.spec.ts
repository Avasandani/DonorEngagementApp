import { expect, test } from '@playwright/test';
import { uniqueName } from '../fixtures/testData';
import { AccountListPage } from '../pages/AccountListPage';
import { HomePage } from '../pages/HomePage';
import { OpportunityListPage } from '../pages/OpportunityListPage';

test('Home page pipeline chart renders after a new Opportunity is added', async ({ page }) => {
  const accountName = uniqueName('Demo University');
  const opportunityName = uniqueName('Chart Gift');

  const homePage = new HomePage(page);
  await homePage.open();
  await homePage.expectPipelineChart();

  const accountListPage = new AccountListPage(page);
  await accountListPage.open();
  await accountListPage.createAccount(accountName);

  const opportunityListPage = new OpportunityListPage(page);
  await opportunityListPage.open();
  await opportunityListPage.createOpportunity({
    name: opportunityName,
    accountName,
    stage: 'Closed Won',
    closeDate: '12/31/2026',
    amount: '750',
  });

  await homePage.open();
  await homePage.expectPipelineChart();
  await expect(homePage.quarterlyChart()).toBeVisible();
});
