import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: { args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI }
});
