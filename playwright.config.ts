/**
 * Playwright Configuration for E2E Tests
 */

import { defineConfig } from 'playwright/test';

export default defineConfig({
	testDir: './src/tests',
	testMatch: /.*\.spec\.ts$/,
	timeout: 30000,
	retries: 0,
	use: {
		headless: false, // Extensions require headed mode
		viewport: { width: 1280, height: 720 },
		actionTimeout: 10000,
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' },
		},
	],
});
