import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local so global-setup can read Supabase credentials.
// dotenv is already available as a transitive dependency.
config({ path: resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30 * 1000,
  fullyParallel: false, // Run tests in sequence for better reliability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for better test isolation

  globalSetup: './tests/ui/global-setup.ts',
  globalTeardown: './tests/ui/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Define projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Only start webServer in local development, not in CI
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});