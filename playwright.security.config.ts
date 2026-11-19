import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/security',
  testMatch: '*.spec.ts',
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4177',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4177 --strictPort --base /',
    url: 'http://127.0.0.1:4177/tests/security/harness.html',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
