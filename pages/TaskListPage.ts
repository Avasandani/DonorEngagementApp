import { expect, type Page } from '@playwright/test';
import { ObjectListPage } from './ObjectListPage';

export interface NewTask {
  subject: string;
  contactName: string;
  dueDate?: string; // MM/DD/YYYY
  priority?: string;
  status?: string;
}

export class TaskListPage extends ObjectListPage {
  constructor(page: Page) {
    super(page, 'Task');
  }

  // The Tasks list has no plain "New" toolbar button; New Task is in the "Show more actions" menu.
  async open(): Promise<void> {
    await this.page.goto('/lightning/o/Task/list', { waitUntil: 'domcontentloaded' });
    await expect(this.page.getByRole('button', { name: 'Show more actions', exact: true })).toBeVisible({ timeout: 30000 });
  }

  // Creating a Task from the list stays on the list, so success is checked by the subject appearing.
  async createTask(task: NewTask): Promise<void> {
    await this.page.getByRole('button', { name: 'Show more actions', exact: true }).click();
    await this.page.getByRole('menuitem', { name: 'New Task', exact: true }).click();

    const dialog = this.page.getByRole('dialog').filter({ hasText: 'New Task' }).first();
    await expect(dialog).toBeVisible({ timeout: 20000 });
    // Subject is an editable combobox (a predefined-subjects picklist that also takes free text).
    await dialog.getByRole('combobox', { name: /^\*?\s*Subject$/ }).fill(task.subject);
    await this.fillLookup(dialog, 'Name', task.contactName);
    if (task.dueDate) await this.fillInput(dialog, 'Due Date', task.dueDate);
    if (task.status) await this.pickOption(dialog, 'Status', task.status);
    if (task.priority) await this.pickOption(dialog, 'Priority', task.priority);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden({ timeout: 15000 });
    await expect(this.page.getByRole('link', { name: task.subject }).first()).toBeVisible({ timeout: 15000 });
  }
}
