import { defineConfig } from 'playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	testMatch: /.*\.spec\.ts$/,
	timeout: 30000,
	retries: 0,
	use: {
		headless: false,
		viewport: { width: 1280, height: 720 },
		actionTimeout: 10000,
		screenshot: 'only-on-failure',
	},
	projects: [
		{ name: 'chromium', use: { browserName: 'chromium' } },
	],
});
