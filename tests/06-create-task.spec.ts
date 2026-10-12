import { expect, test } from '@playwright/test';
import { uniqueEmail, uniqueName } from '../fixtures/testData';
import { AccountListPage } from '../pages/AccountListPage';
import { ContactListPage } from '../pages/ContactListPage';
import { TaskListPage } from '../pages/TaskListPage';

test('logs a follow-up Task linked to a Contact', async ({ page }) => {
  const accountName = uniqueName('Demo University');
  const contactName = uniqueName('Follow Up Alumna');
  const subject = uniqueName('Call alumna about reunion');

  const accountListPage = new AccountListPage(page);
  await accountListPage.open();
  await accountListPage.createAccount(accountName);

  const contactListPage = new ContactListPage(page);
  await contactListPage.open();
  await contactListPage.createContact({
    firstName: 'Jordan',
    lastName: contactName,
    email: uniqueEmail('jordan.alumna'),
    accountName,
  });

  const taskListPage = new TaskListPage(page);
  await taskListPage.open();
  await taskListPage.createTask({
    subject,
    contactName,
    dueDate: '12/31/2026',
    status: 'Not Started',
    priority: 'High',
  });

  await expect(page.getByRole('link', { name: subject }).first()).toBeVisible();
});
