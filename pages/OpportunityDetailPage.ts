import { expect, type Page } from '@playwright/test';
import { ObjectListPage } from './ObjectListPage';

// Operates on the Opportunity record page the browser is already on.
// Extends ObjectListPage only to reuse its form helpers; the object list is not used here.
export class OpportunityDetailPage extends ObjectListPage {
  constructor(page: Page) {
    super(page, 'Opportunity');
  }

  // Stage is changed through the Path control. Option names carry a "stage complete" prefix for
  // finished steps, so match on the end of the name. Salesforce labels the confirm button
  // "Select <stage> Stage" or "Mark as Current Stage", depending on the step.
  async changeStage(stage: string): Promise<void> {
    await this.page.getByRole('option', { name: new RegExp(`${stage}$`) }).click();
    await this.page
      .getByRole('button', { name: new RegExp(`^(Select .+ Stage|Mark (as Current Stage|Stage as Complete))$`) })
      .first()
      .click();

    // Moving to the "Closed" step opens its own "Close This Opportunity" dialog, which requires
    // picking an actual closed stage (Closed Won/Closed Lost) before it commits.
    const closeDialog = this.page.getByRole('dialog').filter({ hasText: 'Close This Opportunity' }).first();
    // isVisible() alone is instantaneous and can race the dialog's render; give it a moment.
    const closeDialogOpened = await closeDialog
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (closeDialogOpened) {
      // This dialog's Stage field is a plain native <select>, unlike the Lightning combobox
      // popups elsewhere, so pick it with selectOption rather than click + option click.
      await closeDialog.getByRole('combobox', { name: 'Stage' }).selectOption({ label: 'Closed Won' });
      await closeDialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(closeDialog).toBeHidden({ timeout: 15000 });
    }
  }

  // Amount and other fields are edited from the "Show more actions" menu.
  async editAmount(amount: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Show more actions', exact: true }).click();
    await this.page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    // The dialog is titled "Edit <record name>", not a fixed "Edit Opportunity", so match on
    // the field it must contain instead of its title.
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Amount' }).first();
    await expect(dialog).toBeVisible({ timeout: 20000 });
    await this.fillInput(dialog, 'Amount', amount);
    await this.saveUntilRecordPage(dialog, /\/lightning\/r\/(Opportunity\/)?006\w+\/view/);
  }

  // KNOWN BLOCKER (see docs/alumni-donor-engagement-context.md section 9 and the 05 spec file):
  // Contact Roles' "Add Contact Roles" action opens a two-step ListViewManagerGrid widget (search
  // and tick a Contact, Next, an optional Primary Contact step, Save). The UI shows the contact
  // selected ("Show Selected (1)", a checked row), but the network call that actually persists the
  // choice - MultiEditDataManager.saveRecords - is sent with "recordsToUpsert": [] every time,
  // regardless of how the row is checked (native input, its styled overlay, with/without settle
  // delays between steps) or how long Save is delayed. The related list stays at "0 items" /
  // "No items to display" afterwards. A direct /lightning/o/OpportunityContactRole/new URL does not
  // open a usable creation form either. This needs a maintainer with access to the org (or Salesforce
  // support) to confirm whether this is an org configuration issue or a genuine product bug in this
  // widget; it is not a Playwright selector problem the way the other fixes in this file were.
  async addContactRole(contactName: string): Promise<void> {
    const addItem = this.page.getByRole('menuitem', { name: 'Add Contact Roles', exact: true });
    // The actions menu does not always open on the first click, so retry the open until its item shows.
    await expect(async () => {
      if (!(await addItem.isVisible())) {
        await this.page.getByRole('button', { name: 'Show actions for Contact Roles', exact: true }).click();
      }
      await expect(addItem).toBeVisible({ timeout: 4000 });
    }).toPass({ timeout: 30000 });
    await addItem.click();

    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Add Contact Roles' }).first();
    await expect(dialog).toBeVisible({ timeout: 20000 });

    const search = dialog.getByRole('combobox', { name: /^Search/ });
    await search.fill(contactName);
    await search.press('Enter');
    const rowCheckbox = dialog.getByRole('checkbox', { name: new RegExp(`Select item .*${contactName}`) }).first();
    // The native input is covered by a styled overlay (slds-checkbox_faux); click that, not the input.
    await rowCheckbox.locator('xpath=following-sibling::*[contains(@class, "slds-checkbox_faux")][1]').click();
    await expect(rowCheckbox).toBeChecked({ timeout: 10000 });
    await dialog.getByRole('button', { name: 'Next', exact: true }).click();
    // The second step loads its Primary Contact field before Save is usable.
    await expect(dialog.getByRole('combobox', { name: /^Primary Contact/ })).toBeEnabled({ timeout: 20000 });
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 20000 });

    await expect(this.page.getByRole('link', { name: contactName }).first()).toBeVisible({ timeout: 45000 });
  }
}
