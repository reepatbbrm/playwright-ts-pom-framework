import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const BROWSER_PROJECTS = {
  edge: {
    name: 'Microsoft Edge',
    use: { ...devices['Desktop Edge'], channel: 'msedge' },
  },
  chrome: {
    name: 'Google Chrome',
    use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  },
};

type BrowserKey = keyof typeof BROWSER_PROJECTS;

function getSelectedBrowser() {
  const browser = (process.env.TEST_BROWSER || 'edge') as BrowserKey;
  if (!BROWSER_PROJECTS[browser]) {
    throw new Error(
      `Invalid TEST_BROWSER="${browser}". Must be one of: ${Object.keys(BROWSER_PROJECTS).join(', ')}`
    );
  }
  return BROWSER_PROJECTS[browser];
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  
  reporter: 'html',
  use: {
    headless: false,
    trace: 'on-first-retry',
  // Set 'id' as the test ID attribute
    testIdAttribute: 'id',
  
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.ts',
    },
    {
      ...getSelectedBrowser(),
      dependencies: ['setup'],
    },
  ],

});
