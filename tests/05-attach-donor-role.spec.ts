import { expect, test } from '@playwright/test';
import { uniqueEmail, uniqueName } from '../fixtures/testData';
import { AccountListPage } from '../pages/AccountListPage';
import { ContactListPage } from '../pages/ContactListPage';
import { OpportunityDetailPage } from '../pages/OpportunityDetailPage';
import { OpportunityListPage } from '../pages/OpportunityListPage';

// KNOWN BLOCKER: Opportunity's "Add Contact Roles" action never actually persists the role in this
// org - see the comment on OpportunityDetailPage.addContactRole for what was tried and ruled out.
// Both tests below are fixme'd until that's resolved by someone with org access; they are not
// selector problems like the other fixes in this suite.
test.describe('Donor contact role', () => {
  test.fixme(
    true,
    'Add Contact Roles never persists (recordsToUpsert sent empty) - see OpportunityDetailPage.addContactRole',
  );

  test('attaches a Contact as the donor on an Opportunity', async ({ page }) => {
    const accountName = uniqueName('Demo University');
    const contactName = uniqueName('Donor');
    const opportunityName = uniqueName('Pledge');

    const accountListPage = new AccountListPage(page);
    await accountListPage.open();
    await accountListPage.createAccount(accountName);

    const contactListPage = new ContactListPage(page);
    await contactListPage.open();
    await contactListPage.createContact({
      firstName: 'Alex',
      lastName: contactName,
      email: uniqueEmail('alex.donor'),
      accountName,
    });

    const opportunityListPage = new OpportunityListPage(page);
    await opportunityListPage.open();
    await opportunityListPage.createOpportunity({
      name: opportunityName,
      accountName,
      stage: 'Prospecting',
      closeDate: '12/31/2026',
    });

    const opportunityDetailPage = new OpportunityDetailPage(page);
    await opportunityDetailPage.addContactRole(contactName);

    await expect(page.getByRole('link', { name: contactName }).first()).toBeVisible();
  });

  // Known gap (section 4): no uniqueness constraint on Contact + Opportunity in OpportunityContactRole.
  test('known gap: the same Contact can be added as a donor role twice', async ({ page }) => {
    const accountName = uniqueName('Demo University');
    const contactName = uniqueName('Repeat Donor');
    const opportunityName = uniqueName('Repeat Pledge');

    const accountListPage = new AccountListPage(page);
    await accountListPage.open();
    await accountListPage.createAccount(accountName);

    const contactListPage = new ContactListPage(page);
    await contactListPage.open();
    await contactListPage.createContact({
      firstName: 'Riley',
      lastName: contactName,
      email: uniqueEmail('riley.donor'),
      accountName,
    });

    const opportunityListPage = new OpportunityListPage(page);
    await opportunityListPage.open();
    await opportunityListPage.createOpportunity({
      name: opportunityName,
      accountName,
      stage: 'Prospecting',
      closeDate: '12/31/2026',
    });

    const opportunityDetailPage = new OpportunityDetailPage(page);
    await opportunityDetailPage.addContactRole(contactName);
    await opportunityDetailPage.addContactRole(contactName);

    const roleRows = page.getByRole('row').filter({ hasText: contactName });
    await expect(roleRows).toHaveCount(2);
  });
});
