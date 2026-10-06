import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90000,
  use: {
    baseURL: 'https://d6f0000027crvuam-dev-ed.lightning.force.com',
    storageState: './playwright/.auth/salesforce.json',
  },
});