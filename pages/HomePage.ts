import { expect, type Page } from '@playwright/test';

export class HomePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/lightning/page/home', { waitUntil: 'domcontentloaded' });
  }

  quarterlyChart() {
    return this.page.getByText('Quarterly Performance', { exact: false }).first();
  }

  async expectPipelineChart(): Promise<void> {
    await expect(this.quarterlyChart()).toBeVisible({ timeout: 30000 });
    // A bare "Open" regex also matches an unrelated hidden nav string ("Open menu item submenu"),
    // so match the full legend labels instead: "Closed", "Open (>70%)" and "Goal".
    for (const legend of ['Closed', 'Open (>70%)', 'Goal']) {
      await expect(this.page.getByText(legend, { exact: true }).first()).toBeVisible({ timeout: 15000 });
    }
  }
}
