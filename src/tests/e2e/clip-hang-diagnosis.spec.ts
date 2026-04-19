import { getExtensionLaunchArgs, getExtensionPageUrl } from '@/tests/helpers/extension-target.ts';
import fs from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, test } from 'playwright/test';

const fixtureHost = 'https://fixtures.snipsnip.test';
const fixtureFile = path.join(
	import.meta.dirname,
	'../fixtures/e2e-pages/extension/deterministic-article.html',
);

test.describe('Clip hang diagnosis', () => {
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

	test('popup opens with fixture as active tab — capture all events', async () => {
		const fixturePage = await context.newPage();
		const popupPage = await context.newPage();

		const allEvents: string[] = [];
		const tag = (prefix: string, text: string) => allEvents.push(`[${Date.now()}][${prefix}] ${text}`);

		popupPage.on('pageerror', (err) => tag('POPUP-PAGEERROR', err.message + '\n' + (err.stack || '')));
		popupPage.on('console', (msg) => tag(`POPUP-${msg.type().toUpperCase()}`, msg.text()));
		popupPage.on('requestfailed', (req) => tag('POPUP-REQFAILED', `${req.url()} — ${req.failure()?.errorText}`));

		const [serviceWorker] = context.serviceWorkers();
		if (serviceWorker) {
			serviceWorker.on('console', (msg) => tag(`SW-${msg.type().toUpperCase()}`, msg.text()));
		}

		try {
			tag('TEST', 'loading fixture page');
			await fixturePage.goto(`${fixtureHost}/extension/deterministic-article.html`);
			await fixturePage.waitForLoadState('networkidle');
			await fixturePage.bringToFront();
			tag('TEST', 'fixture loaded, opening popup');

			await popupPage.goto(getExtensionPageUrl(extensionId));

			// Wait 15s and capture DOM state every 3s
			for (let i = 0; i < 5; i++) {
				await new Promise((r) => setTimeout(r, 3000));
				const state = await popupPage.evaluate(() => {
					const container = document.getElementById('container');
					const spinner = document.getElementById('spinner');
					const computedContainer = container ? getComputedStyle(container).display : 'no-container';
					const computedSpinner = spinner ? getComputedStyle(spinner).display : 'no-spinner';
					const activeView = (window as unknown as { activePopupView?: string | null }).activePopupView;
					return { computedContainer, computedSpinner, activeView };
				});
				tag(
					'DOM',
					`t+${
						(i + 1) * 3
					}s container.display=${state.computedContainer} spinner.display=${state.computedSpinner} view=${
						state.activeView ?? 'unset'
					}`,
				);
			}

			// Dump everything we saw
			console.log('\n========== EVENT LOG ==========');
			for (const ev of allEvents) console.log(ev);
			console.log('========== END LOG ==========\n');
		} finally {
			await popupPage.close().catch(() => {});
			await fixturePage.close().catch(() => {});
		}
	});
});
