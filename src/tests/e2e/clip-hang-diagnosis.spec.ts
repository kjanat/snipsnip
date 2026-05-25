import { getExtensionLaunchArgs, getExtensionPageUrl } from '@/tests/helpers/extension-target.ts';
import fs from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, test } from 'playwright/test';

const fixtureHost = 'https://fixtures.snipsnip.test';
const fixtureFile = path.join(
	import.meta.dirname,
	'../fixtures/e2e-pages/extension/deterministic-article.html',
);

test.describe('Clip flow: spinner + error pipeline end-to-end', () => {
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

	// Known-failing in this harness: Chrome rejects `scripting.executeScript`
	// on Playwright-mocked URLs ("Cannot access contents of the page.
	// Extension manifest must request permission to access the respective
	// host.") even with host_permissions: <all_urls>. The production clip
	// flow is verified manually in the browser — the error-pipeline test
	// below is the reliable regression signal for the messaging layer.
	test.fixme('happy path: clip produces real markdown in CM6 (not an error message)', async () => {
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
		popupPage.on('pageerror', (err) => pageErrors.push(err.message));

		try {
			await popupPage.goto(getExtensionPageUrl(extensionId));
			await expect(popupPage.locator('.cm-editor')).toBeVisible({ timeout: 10000 });

			await popupPage.evaluate(async (tabId) => {
				// @ts-expect-error — clipSite exposed on window in popup.ts
				await clipSite(tabId);
			}, fixtureTabId);

			// Pass condition: CM6 contains the fixture's article text. Critically, we
			// do *not* accept "spinner hides" as a pass, because showError also hides
			// the spinner — that was the false-positive in the previous version of
			// this test.
			await expect.poll(
				async () => {
					return await popupPage.evaluate(() => {
						const cm = (window as unknown as { cm?: { getValue?: () => string } }).cm;
						return cm?.getValue?.() || '';
					});
				},
				{ timeout: 30000 },
			).toContain('This page is routed by Playwright');

			const spinnerDisplay = await popupPage.evaluate(() => {
				const el = document.getElementById('spinner');
				return el ? getComputedStyle(el).display : 'no-element';
			});
			expect(spinnerDisplay).toBe('none');
			expect(pageErrors).toEqual([]);
		} finally {
			await popupPage.close().catch(() => {});
			await fixturePage.close().catch(() => {});
		}
	});

	test('error pipeline: simulated process-error reaches popup as clip-error and hides spinner', async () => {
		// Regression: when offscreen throws, it sends `process-error`. Previously
		// the SW had no handler and the popup spun forever. Now the SW forwards
		// as `clip-error` and the popup's notify() → showError renders the
		// message. This test simulates the offscreen throw directly from the SW.
		const popupPage = await context.newPage();
		try {
			await popupPage.goto(getExtensionPageUrl(extensionId));
			await expect(popupPage.locator('.cm-editor')).toBeVisible({ timeout: 10000 });

			// Force the popup into the "processing" state so we can verify the
			// error actually hides it.
			await popupPage.evaluate(() => {
				const el = document.getElementById('spinner');
				if (el) el.style.display = 'flex';
			});

			// Must send from the popup context (not the SW). Chrome's
			// runtime.sendMessage doesn't loop messages back to the sender, so
			// SW-self-sends can't reach the SW's own onMessage('process-error')
			// handler. Sending from the popup crosses context boundaries and
			// the listener fires. @webext-core's envelope shape is `{id, type,
			// data, timestamp}` per node_modules/@webext-core/messaging source.
			await popupPage.evaluate(() => {
				chrome.runtime.sendMessage({
					id: 1,
					type: 'process-error',
					data: { error: 'Synthetic failure from e2e test — offscreen throw simulation' },
					timestamp: Date.now(),
				}).catch(() => {
					// Fire-and-forget; we don't care about the response envelope.
				});
			});

			// Spinner must end up hidden because showError ran.
			await expect.poll(
				async () => {
					return await popupPage.evaluate(() => {
						const el = document.getElementById('spinner');
						return el ? getComputedStyle(el).display : 'no-element';
					});
				},
				{ timeout: 5000 },
			).toBe('none');

			// CM6 should contain the error text that showError rendered, not real
			// markdown. The exact wording comes from `new Error(message.error || ...)`
			// in the clip-error branch of notify().
			const editorText = await popupPage.evaluate(() => {
				const cm = (window as unknown as { cm?: { getValue?: () => string } }).cm;
				return cm?.getValue?.() || '';
			});
			expect(editorText).toContain('Synthetic failure');
		} finally {
			await popupPage.close().catch(() => {});
		}
	});
});
