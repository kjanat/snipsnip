import { getExtensionLaunchArgs, getExtensionPageUrl } from '@/tests/helpers/extension-target.ts';
import fs from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, test } from 'playwright/test';

const fixtureHost = 'https://fixtures.snipsnip.test';
const fixtureFile = path.join(
	import.meta.dirname,
	'../fixtures/e2e-pages/extension/deterministic-article.html',
);

test.describe('Clip spinner resolves (regression: offscreen cloneRuntimeOptions `s,` bug)', () => {
	let context: BrowserContext;
	let extensionId: string;

	test.beforeAll(async () => {
		context = await chromium.launchPersistentContext('', {
			headless: false,
			args: getExtensionLaunchArgs(),
		});

		await context.route(`${fixtureHost}/**`, async (route) => {
			await route.fulfill({
				status: 200,
				contentType: 'text/html; charset=utf-8',
				body: fs.readFileSync(fixtureFile, 'utf8'),
			});
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

	test('popup opens, clips fixture, spinner hides, CM6 shows markdown', async () => {
		const fixturePage = await context.newPage();
		await fixturePage.goto(`${fixtureHost}/extension/deterministic-article.html`);
		await fixturePage.waitForLoadState('networkidle');
		await fixturePage.bringToFront();

		const [serviceWorker] = context.serviceWorkers();
		const fixtureTabId = await serviceWorker.evaluate(async ({ targetUrl }) => {
			const tabs = await chrome.tabs.query({});
			return tabs.find((tab: { url?: string }) => tab.url === targetUrl)?.id || null;
		}, { targetUrl: fixturePage.url() });
		expect(fixtureTabId).toBeTruthy();

		const popupPage = await context.newPage();
		const pageErrors: string[] = [];
		popupPage.on('pageerror', (err) => pageErrors.push(`PAGE ERROR: ${err.message}`));

		try {
			await popupPage.goto(getExtensionPageUrl(extensionId));
			await expect(popupPage.locator('.cm-editor')).toBeVisible({ timeout: 10000 });

			// Drive the clip against the *fixture* tab, not the popup page itself.
			await popupPage.evaluate(async (tabId) => {
				// @ts-expect-error — clipSite is a popup-scope global
				await clipSite(tabId);
			}, fixtureTabId);

			// The hang bug: offscreen threw `ReferenceError: s is not defined` on every
			// process-content message, so `markdown-result` was never sent and the popup
			// never received `display.md` → spinner stuck on "Processing page..." forever.
			//
			// Regression check: the clip flow must *terminate* within a short window —
			// either with the markdown displayed, or a visible error. Anything other
			// than a perpetual spinner means the offscreen message handler isn't throwing.
			await expect.poll(
				async () => {
					return await popupPage.evaluate(() => {
						const spinner = document.getElementById('spinner');
						return spinner ? getComputedStyle(spinner).display : 'no-element';
					});
				},
				{ timeout: 20000, intervals: [500, 500, 1000] },
			).toBe('none');

			expect(pageErrors).toEqual([]);
		} finally {
			await popupPage.close().catch(() => {});
			await fixturePage.close().catch(() => {});
		}
	});
});
