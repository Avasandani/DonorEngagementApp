import { expect, test } from '@playwright/test';
import { uniqueEmail, uniqueName } from '../fixtures/testData';
import { AccountListPage } from '../pages/AccountListPage';
import { CampaignDetailPage } from '../pages/CampaignDetailPage';
import { CampaignListPage } from '../pages/CampaignListPage';
import { ContactListPage } from '../pages/ContactListPage';

test.describe('Campaign membership', () => {
  test('adds a Contact to a Campaign as a campaign member', async ({ page }) => {
    const accountName = uniqueName('Demo University');
    const contactName = uniqueName('Alumnus');
    const campaignName = uniqueName('Reunion Appeal');

    const accountListPage = new AccountListPage(page);
    await accountListPage.open();
    await accountListPage.createAccount(accountName);

    const contactListPage = new ContactListPage(page);
    await contactListPage.open();
    await contactListPage.createContact({
      firstName: 'Sam',
      lastName: contactName,
      email: uniqueEmail('sam.alumnus'),
      accountName,
    });

    const campaignListPage = new CampaignListPage(page);
    await campaignListPage.open();
    await campaignListPage.createCampaign({ name: campaignName, status: 'Planned' });

    const campaignDetailPage = new CampaignDetailPage(page);
    await campaignDetailPage.addContactAsMember(contactName);

    await expect(page.getByRole('link', { name: contactName }).first()).toBeVisible();
  });

  // The context doc (section 4) flagged duplicate CampaignMember rows as an unconfirmed gap to
  // test for. Running it showed the opposite: once a Contact is already a member, the Add Contacts
  // dialog's row checkbox for them no longer toggles, so a second add cannot go through from this
  // UI. This test documents that corrected finding rather than the original gap assumption.
  test('Salesforce blocks adding the same Contact to a Campaign twice from the Add Contacts dialog', async ({ page }) => {
    // Two full add-member dialog cycles (the second one deliberately failing) run past the
    // default 90s test timeout.
    test.setTimeout(150000);
    const accountName = uniqueName('Demo University');
    const contactName = uniqueName('Alumnus');
    const campaignName = uniqueName('Duplicate Gap Appeal');

    const accountListPage = new AccountListPage(page);
    await accountListPage.open();
    await accountListPage.createAccount(accountName);

    const contactListPage = new ContactListPage(page);
    await contactListPage.open();
    await contactListPage.createContact({
      firstName: 'Dana',
      lastName: contactName,
      email: uniqueEmail('dana.alumnus'),
      accountName,
    });

    const campaignListPage = new CampaignListPage(page);
    await campaignListPage.open();
    await campaignListPage.createCampaign({ name: campaignName, status: 'Planned' });

    const campaignDetailPage = new CampaignDetailPage(page);
    await campaignDetailPage.addContactAsMember(contactName);

    let secondAddBlocked = false;
    try {
      await campaignDetailPage.addContactAsMember(contactName);
    } catch {
      secondAddBlocked = true;
      // The failed attempt leaves its search dialog open; its own row also matches contactName,
      // so close it before counting the real related-list rows below.
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden({ timeout: 10000 }).catch(() => {});
    }

    expect(secondAddBlocked).toBe(true);
    expect(await campaignDetailPage.memberRowCount(contactName)).toBe(1);
  });
});
