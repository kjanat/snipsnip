import { afterEach, describe, expect, mock, test } from 'bun:test';

import { bootPopupRuntime, resetPopupRuntimeBootstrapState } from '@/lib/popup/bootstrap';

const { JSDOM } = require('@/tests/helpers/jsdom-shim');

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalDomParser = globalThis.DOMParser;
const originalHtmlScriptElement = globalThis.HTMLScriptElement;
const originalBrowser = globalThis.browser;
const originalAgentBridgeState = globalThis.snipSnipAgentBridgeState;
const originalCountUtils = globalThis.snipSnipCountUtils;
const originalLibraryState = globalThis.snipSnipLibraryState;
const originalObsidian = globalThis.snipSnipObsidian;
const originalOptionsState = globalThis.snipSnipOptionsState;
const originalPagePaths = globalThis.snipSnipPagePaths;
const originalPopupAssets = globalThis.snipSnipPopupAssets;
const originalPopupBatchUtils = Reflect.get(globalThis, 'snipSnipPopupBatchUtils');

function setReadonlyGlobal(
	name: 'window' | 'document' | 'navigator' | 'DOMParser' | 'HTMLScriptElement',
	value: unknown,
): void {
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value,
		writable: true,
	});
}

afterEach(() => {
	resetPopupRuntimeBootstrapState();
	setReadonlyGlobal('window', originalWindow);
	setReadonlyGlobal('document', originalDocument);
	setReadonlyGlobal('navigator', originalNavigator);
	setReadonlyGlobal('DOMParser', originalDomParser);
	setReadonlyGlobal('HTMLScriptElement', originalHtmlScriptElement);
	globalThis.browser = originalBrowser;
	globalThis.snipSnipAgentBridgeState = originalAgentBridgeState;
	globalThis.snipSnipCountUtils = originalCountUtils;
	globalThis.snipSnipLibraryState = originalLibraryState;
	globalThis.snipSnipObsidian = originalObsidian;
	globalThis.snipSnipOptionsState = originalOptionsState;
	globalThis.snipSnipPagePaths = originalPagePaths;
	globalThis.snipSnipPopupAssets = originalPopupAssets;
	if (originalPopupBatchUtils == null) {
		Reflect.deleteProperty(globalThis, 'snipSnipPopupBatchUtils');
	} else {
		Reflect.set(globalThis, 'snipSnipPopupBatchUtils', originalPopupBatchUtils);
	}
});

describe('popup runtime bootstrap', () => {
	test('installs popup shell, globals, assets, and dedupes runtime loading', async () => {
		const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
			url: 'https://example.com/popup.html',
		});

		setReadonlyGlobal('window', dom.window);
		setReadonlyGlobal('document', dom.window.document);
		setReadonlyGlobal('navigator', dom.window.navigator);
		setReadonlyGlobal('DOMParser', dom.window.DOMParser);
		setReadonlyGlobal('HTMLScriptElement', dom.window.HTMLScriptElement);
		globalThis.browser = undefined;
		globalThis.snipSnipAgentBridgeState = undefined;
		globalThis.snipSnipCountUtils = undefined;
		globalThis.snipSnipLibraryState = undefined;
		globalThis.snipSnipObsidian = undefined;
		globalThis.snipSnipOptionsState = undefined;
		globalThis.snipSnipPopupAssets = undefined;
		Reflect.deleteProperty(globalThis, 'snipSnipPopupBatchUtils');

		const loadScript = mock(async () => ({}));
		const importThemeBootstrapModule = mock(async () => ({}));
		const importPopupShortcutsModule = mock(async () => ({}));
		const importPopupRuntimeModule = mock(async () => ({}));

		await Promise.all([
			bootPopupRuntime({
				loadScript,
				importThemeBootstrapModule,
				importPopupShortcutsModule,
				importPopupRuntimeModule,
			}),
			bootPopupRuntime({
				loadScript,
				importThemeBootstrapModule,
				importPopupShortcutsModule,
				importPopupRuntimeModule,
			}),
		]);

		expect(document.title).toBe('SnipSnip');
		expect(document.documentElement.classList.contains('theme-system')).toBe(true);
		expect(document.getElementById('container')).not.toBeNull();
		expect(document.getElementById('popup-fonts-stylesheet')).not.toBeNull();
		expect(document.getElementById('popup-codemirror-stylesheet')).not.toBeNull();
		expect(document.getElementById('popup-shell-stylesheet')).not.toBeNull();
		expect((document.getElementById('guideLink') as HTMLAnchorElement | null)?.getAttribute('href')).toBe(
			'/guide.html',
		);
		expect((document.getElementById('options') as HTMLAnchorElement | null)?.getAttribute('href')).toBe(
			'/options.html',
		);
		expect(globalThis.browser).toBeDefined();
		expect(globalThis.snipSnipAgentBridgeState).toBeDefined();
		expect(globalThis.snipSnipCountUtils).toBeDefined();
		expect(globalThis.snipSnipLibraryState).toBeDefined();
		expect(globalThis.snipSnipObsidian).toBeDefined();
		expect(globalThis.snipSnipOptionsState).toBeDefined();
		expect(globalThis.snipSnipPagePaths).toEqual({ guide: 'guide.html', options: 'options.html' });
		expect(Reflect.get(globalThis, 'snipSnipPopupBatchUtils')).toBeDefined();
		expect(typeof globalThis.snipSnipPopupAssets?.['lib/marked.min.js']).toBe('string');
		expect(typeof globalThis.snipSnipPopupAssets?.['popup/lib/github-markdown.css']).toBe('string');
		expect(typeof globalThis.snipSnipPopupAssets?.['print/print.css']).toBe('string');
		expect(typeof globalThis.snipSnipPopupAssets?.['../notifications/notification-host.js']).toBe('string');
		expect(importThemeBootstrapModule).toHaveBeenCalledTimes(1);
		expect(importPopupShortcutsModule).toHaveBeenCalledTimes(1);
		expect(importPopupRuntimeModule).toHaveBeenCalledTimes(1);
		expect(loadScript).toHaveBeenCalledTimes(2);
	});
});
