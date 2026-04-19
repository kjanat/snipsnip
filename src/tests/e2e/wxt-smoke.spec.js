const { test, expect, chromium } = require('playwright/test');
const {
	getExtensionPageUrl,
	getExtensionLaunchArgs,
} = require('../helpers/extension-target');

test.describe('WXT smoke', () => {
	let context;
	let extensionId;

	test.beforeAll(async () => {
		context = await chromium.launchPersistentContext('', {
			headless: false,
			args: getExtensionLaunchArgs(),
		});

		let [serviceWorker] = context.serviceWorkers();
		if (!serviceWorker) {
			serviceWorker = await context.waitForEvent('serviceworker', { timeout: 15000 });
		}

		extensionId = new URL(serviceWorker.url()).host;
	});

	test.afterAll(async () => {
		await context?.close();
	});

	test('loads popup with WXT page paths', async () => {
		const popupPage = await context.newPage();

		try {
			await popupPage.goto(getExtensionPageUrl(extensionId));
			await expect(popupPage.locator('#container')).toBeVisible();
			await expect(popupPage.locator('#guideLink')).toHaveAttribute('href', '/guide.html');
			await expect(popupPage.locator('#options')).toHaveAttribute('href', '/options.html');
		} finally {
			await popupPage.close().catch(() => {});
		}
	});

	test('loads options page', async () => {
		const optionsPage = await context.newPage();

		try {
			await optionsPage.goto(getExtensionPageUrl(extensionId, 'options.html'));
			await expect(optionsPage.locator('#tab-library')).toBeVisible();
			await expect(optionsPage.locator('#tab-import-export')).toBeVisible();
		} finally {
			await optionsPage.close().catch(() => {});
		}
	});

	test('loads guide page and welcome shell', async () => {
		const guidePage = await context.newPage();

		try {
			await guidePage.goto(getExtensionPageUrl(extensionId, 'guide.html'));
			await expect(guidePage.locator('#guide-layout')).toBeVisible();
			await expect(guidePage.locator('#guide-content')).toBeVisible();
		} finally {
			await guidePage.close().catch(() => {});
		}
	});
});
