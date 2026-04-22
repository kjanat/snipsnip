import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, chromium, expect, test } from 'playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3');

test.describe('SnipSnip Svelte rebuild', () => {
	let context: BrowserContext;
	let extensionId: string;

	test.beforeAll(async () => {
		context = await chromium.launchPersistentContext('', {
			headless: false,
			args: [
				`--disable-extensions-except=${EXTENSION_PATH}`,
				`--load-extension=${EXTENSION_PATH}`,
			],
		});

		let serviceWorker = context.serviceWorkers()[0];
		if (!serviceWorker) {
			serviceWorker = await context.waitForEvent('serviceworker');
		}
		const url = serviceWorker.url();
		const match = url.match(/chrome-extension:\/\/([^/]+)/);
		if (!match?.[1]) throw new Error(`Cannot derive extension id from ${url}`);
		extensionId = match[1];
	});

	test.afterAll(async () => {
		await context?.close();
	});

	test('popup renders with brand + tabs', async () => {
		const popup = await context.newPage();
		await popup.goto(`chrome-extension://${extensionId}/popup.html`);
		await expect(popup.getByText('SnipSnip', { exact: true })).toBeVisible();
		await expect(popup.getByRole('tab', { name: 'Document' })).toBeVisible();
		await expect(popup.getByRole('tab', { name: 'Selection' })).toBeVisible();
		await popup.close();
	});

	test('options page renders settings sections', async () => {
		const options = await context.newPage();
		await options.goto(`chrome-extension://${extensionId}/options.html`);
		await expect(options.getByRole('heading', { name: 'SnipSnip Settings' })).toBeVisible();
		await expect(options.getByRole('heading', { name: 'Markdown' })).toBeVisible();
		await expect(options.getByRole('heading', { name: 'Template' })).toBeVisible();
		await expect(options.getByRole('heading', { name: 'Agent Bridge' })).toBeVisible();
		await options.close();
	});

	test('batch page renders URL input', async () => {
		const batch = await context.newPage();
		await batch.goto(`chrome-extension://${extensionId}/batch.html`);
		await expect(batch.getByRole('heading', { name: 'Batch Markdown Export' })).toBeVisible();
		await expect(batch.getByRole('button', { name: 'Convert' })).toBeVisible();
		await batch.close();
	});
});
