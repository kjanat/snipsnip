import { afterEach, describe, expect, mock, test } from 'bun:test';

import { bootGuideRuntime, resetGuideRuntimeBootstrapState } from '../../lib/guide/bootstrap.ts';

const { JSDOM } = require('../helpers/jsdom-shim');

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalDomParser = globalThis.DOMParser;
const originalHtmlScriptElement = globalThis.HTMLScriptElement;
const originalBrowser = globalThis.browser;
const originalDefaultOptions = globalThis.defaultOptions;
const originalPagePaths = globalThis.snipSnipPagePaths;
const originalSearchCore = Reflect.get(globalThis, 'snipSnipSearchCore');

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
	resetGuideRuntimeBootstrapState();
	setReadonlyGlobal('window', originalWindow);
	setReadonlyGlobal('document', originalDocument);
	setReadonlyGlobal('navigator', originalNavigator);
	setReadonlyGlobal('DOMParser', originalDomParser);
	setReadonlyGlobal('HTMLScriptElement', originalHtmlScriptElement);
	globalThis.browser = originalBrowser;
	globalThis.defaultOptions = originalDefaultOptions;
	globalThis.snipSnipPagePaths = originalPagePaths;

	if (originalSearchCore == null) {
		Reflect.deleteProperty(globalThis, 'snipSnipSearchCore');
	} else {
		Reflect.set(globalThis, 'snipSnipSearchCore', originalSearchCore);
	}
});

describe('guide runtime bootstrap', () => {
	test('installs guide shell, globals, and dedupes script loading', async () => {
		const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
			url: 'https://example.com/guide.html',
		});

		setReadonlyGlobal('window', dom.window);
		setReadonlyGlobal('document', dom.window.document);
		setReadonlyGlobal('navigator', dom.window.navigator);
		setReadonlyGlobal('DOMParser', dom.window.DOMParser);
		setReadonlyGlobal('HTMLScriptElement', dom.window.HTMLScriptElement);
		globalThis.browser = undefined;
		globalThis.defaultOptions = undefined;
		globalThis.snipSnipPagePaths = undefined;
		Reflect.deleteProperty(globalThis, 'snipSnipSearchCore');

		const loadScript = mock(async () => ({}));

		await Promise.all([
			bootGuideRuntime({ loadScript }),
			bootGuideRuntime({ loadScript }),
		]);

		expect(document.title).toBe('SnipSnip User Guide');
		expect(document.getElementById('guide-content')).not.toBeNull();
		expect(document.getElementById('guide-fonts-stylesheet')).not.toBeNull();
		expect(document.getElementById('guide-shell-stylesheet')).not.toBeNull();
		expect(globalThis.browser).toBeDefined();
		expect(globalThis.defaultOptions).toBeDefined();
		const pagePaths = Reflect.get(globalThis, 'snipSnipPagePaths');
		expect(pagePaths).toBeDefined();
		if (pagePaths == null) {
			throw new Error('Expected WXT page paths to be installed');
		}
		expect(Reflect.get(pagePaths, 'guide')).toBe('guide.html');
		expect(Reflect.get(pagePaths, 'options')).toBe('options.html');
		expect(Reflect.get(globalThis, 'snipSnipSearchCore')).toBeDefined();
		expect(loadScript).toHaveBeenCalledTimes(1);
	});
});
