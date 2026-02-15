import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local so global-setup can read Supabase credentials.
// dotenv is already available as a transitive dependency.
config({ path: resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30 * 1000,

  globalSetup: './tests/ui/global-setup.ts',
  globalTeardown: './tests/ui/global-teardown.ts',

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
