import { expect, test } from '@playwright/test';
import { uniqueName } from '../fixtures/testData';
import { AccountListPage } from '../pages/AccountListPage';
import { OpportunityDetailPage } from '../pages/OpportunityDetailPage';
import { OpportunityListPage } from '../pages/OpportunityListPage';

// The Path control lists the closing stage as "Closed".
const CLOSED_STAGE = 'Closed';

test.describe('Opportunity progression', () => {
  test('moves an Opportunity from Prospecting to Closed Won', async ({ page }) => {
    const accountName = uniqueName('Demo University');
    const opportunityName = uniqueName('Progressing Gift');

    const accountListPage = new AccountListPage(page);
    await accountListPage.open();
    await accountListPage.createAccount(accountName);

    const opportunityListPage = new OpportunityListPage(page);
    await opportunityListPage.open();
    await opportunityListPage.createOpportunity({
      name: opportunityName,
      accountName,
      stage: 'Prospecting',
      closeDate: '12/31/2026',
      amount: '1000',
    });

    const opportunityDetailPage = new OpportunityDetailPage(page);
    await opportunityDetailPage.changeStage('Negotiation/Review');
    await expect(page.getByRole('option', { name: 'Negotiation/Review', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });

    // Moving to "Closed" opens its own dialog that commits the Opportunity as Closed Won.
    await opportunityDetailPage.changeStage(CLOSED_STAGE);
    await expect(page.getByRole('option', { name: 'Closed Won', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });

    await opportunityDetailPage.editAmount('1500');
    await expect(page.getByText('1,500', { exact: false }).first()).toBeVisible({ timeout: 15000 });
  });

  // Known gap (section 4): no validation rule confirms Amount is required before Closed Won.
  // Asserts the current behavior: the stage change goes through with no Amount.
  test('known gap: Closed Won can be saved without an Amount', async ({ page }) => {
    const accountName = uniqueName('Demo University');
    const opportunityName = uniqueName('No Amount Gift');

    const accountListPage = new AccountListPage(page);
    await accountListPage.open();
    await accountListPage.createAccount(accountName);

    const opportunityListPage = new OpportunityListPage(page);
    await opportunityListPage.open();
    await opportunityListPage.createOpportunity({
      name: opportunityName,
      accountName,
      stage: 'Prospecting',
      closeDate: '12/31/2026',
    });

    const opportunityDetailPage = new OpportunityDetailPage(page);
    await opportunityDetailPage.changeStage(CLOSED_STAGE);

    await expect(page.getByRole('option', { name: 'Closed Won', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 15000 });
  });
});
