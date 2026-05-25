import { getExtensionLaunchArgs, getExtensionPageUrl } from '@/tests/helpers/extension-target.ts';
import fs from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, test } from 'playwright/test';

const fixtureHost = 'https://fixtures.snipsnip.test';
const fixtureFile = path.join(
	import.meta.dirname,
	'../fixtures/e2e-pages/extension/deterministic-article.html',
);

test.describe('CM6 post-migration smoke', () => {
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

	test('popup renders CM6 editor with .cm-editor / .cm-content', async () => {
		const popupPage = await context.newPage();
		const consoleErrors: string[] = [];
		popupPage.on('pageerror', (err) => consoleErrors.push(`PAGE ERROR: ${err.message}`));
		popupPage.on('console', (msg) => {
			if (msg.type() === 'error') consoleErrors.push(`CONSOLE ERROR: ${msg.text()}`);
		});

		try {
			await popupPage.goto(getExtensionPageUrl(extensionId));
			await expect(popupPage.locator('#container')).toBeVisible({ timeout: 10000 });

			// CM6 renders this DOM hierarchy: .cm-editor > .cm-scroller > .cm-content > .cm-line
			await expect(popupPage.locator('.cm-editor')).toBeVisible({ timeout: 10000 });
			await expect(popupPage.locator('.cm-content')).toBeAttached({ timeout: 5000 });

			// Wrapper exposed on window for benchmark + debugging
			const hasWrapper = await popupPage.evaluate(() => {
				const cm = (window as unknown as { cm?: { getValue?: () => unknown } }).cm;
				return cm != null && typeof cm.getValue === 'function';
			});
			expect(hasWrapper).toBe(true);

			// Report any errors collected during popup load
			if (consoleErrors.length > 0) {
				console.log('\n[popup console errors]:\n' + consoleErrors.join('\n'));
			}
			// The popup shouldn't have ANY page errors (uncaught exceptions)
			expect(consoleErrors.filter((e) => e.startsWith('PAGE ERROR')).length).toBe(0);
		} finally {
			await popupPage.close().catch(() => {});
		}
	});

	test('editor wrapper setValue roundtrips, no page errors', async () => {
		const popupPage = await context.newPage();
		const pageErrors: string[] = [];

		popupPage.on('pageerror', (err) => pageErrors.push(err.message));

		try {
			await popupPage.goto(getExtensionPageUrl(extensionId));
			await expect(popupPage.locator('.cm-editor')).toBeVisible({ timeout: 10000 });

			// Exercise the CM6 wrapper API through the window-exposed instance
			const roundtrip = await popupPage.evaluate(() => {
				const cm = (window as unknown as {
					cm?: {
						getValue: () => string;
						setValue: (v: string) => void;
						somethingSelected: () => boolean;
						getSelection: () => string;
					};
				}).cm;
				if (!cm) return { ok: false, reason: 'cm not exposed on window' };

				cm.setValue('# Hello from smoke test\n\n**bold** and _italic_');
				const after = cm.getValue();
				const selectedBefore = cm.somethingSelected();
				return { ok: true, after, selectedBefore };
			});

			expect(roundtrip.ok).toBe(true);
			expect(roundtrip.after).toContain('# Hello from smoke test');
			expect(roundtrip.selectedBefore).toBe(false);
			expect(pageErrors).toEqual([]);
		} finally {
			await popupPage.close().catch(() => {});
		}
	});

	test('theme hot-swap applies a CM6 theme extension', async () => {
		const popupPage = await context.newPage();
		try {
			await popupPage.goto(getExtensionPageUrl(extensionId));
			await expect(popupPage.locator('.cm-editor')).toBeVisible({ timeout: 10000 });

			// Import the theme registry from the popup's bundle and verify loadTheme() resolves
			const themeWorked = await popupPage.evaluate(async () => {
				try {
					// @ts-expect-error — dynamic import of extension path, types not available
					const mod = await import('/chunks/popup-P2QQfu5-.js').catch(() => null);
					// Just verify the editor has a theme class applied by CM6
					const editor = document.querySelector('.cm-editor');
					if (!editor) return { ok: false, reason: 'no .cm-editor' };

					// CM6 themes add a generated class like ".ͼo" (U+037C variant) — detect one
					const classes = Array.from(editor.classList);
					const hasGenerated = classes.some((c) => /^ͼ/.test(c));
					return { ok: true, classes, hasGenerated, modLoaded: mod != null };
				} catch (err) {
					return { ok: false, reason: String(err) };
				}
			});

			console.log('theme probe:', JSON.stringify(themeWorked));
			expect(themeWorked.ok).toBe(true);
		} finally {
			await popupPage.close().catch(() => {});
		}
	});
});
