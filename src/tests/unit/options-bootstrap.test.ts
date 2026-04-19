import { afterEach, describe, expect, mock, test } from 'bun:test';

import { bootOptionsRuntime, resetOptionsRuntimeBootstrapState } from '@/lib/options/bootstrap';

const { JSDOM } = require('@/tests/helpers/jsdom-shim');

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalNavigator = globalThis.navigator;
const originalDomParser = globalThis.DOMParser;
const originalHtmlScriptElement = globalThis.HTMLScriptElement;
const originalBrowser = globalThis.browser;
const originalDefaultOptions = globalThis.defaultOptions;
const originalMoment = globalThis.moment;
const originalAgentBridgeState = globalThis.snipSnipAgentBridgeState;
const originalLibraryState = globalThis.snipSnipLibraryState;
const originalOptionsState = globalThis.snipSnipOptionsState;
const originalPagePaths = globalThis.snipSnipPagePaths;
const originalSearchCore = Reflect.get(globalThis, 'snipSnipSearchCore');
const originalSiteRules = globalThis.snipSnipSiteRules;
const originalTemplateUtils = globalThis.snipSnipTemplateUtils;
const originalCreateMenus = Reflect.get(globalThis, 'createMenus');

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
	resetOptionsRuntimeBootstrapState();
	setReadonlyGlobal('window', originalWindow);
	setReadonlyGlobal('document', originalDocument);
	setReadonlyGlobal('navigator', originalNavigator);
	setReadonlyGlobal('DOMParser', originalDomParser);
	setReadonlyGlobal('HTMLScriptElement', originalHtmlScriptElement);
	globalThis.browser = originalBrowser;
	globalThis.defaultOptions = originalDefaultOptions;
	globalThis.moment = originalMoment;
	globalThis.snipSnipAgentBridgeState = originalAgentBridgeState;
	globalThis.snipSnipLibraryState = originalLibraryState;
	globalThis.snipSnipOptionsState = originalOptionsState;
	globalThis.snipSnipPagePaths = originalPagePaths;
	globalThis.snipSnipSiteRules = originalSiteRules;
	globalThis.snipSnipTemplateUtils = originalTemplateUtils;

	if (originalSearchCore == null) {
		Reflect.deleteProperty(globalThis, 'snipSnipSearchCore');
	} else {
		Reflect.set(globalThis, 'snipSnipSearchCore', originalSearchCore);
	}

	if (originalCreateMenus == null) {
		Reflect.deleteProperty(globalThis, 'createMenus');
	} else {
		Reflect.set(globalThis, 'createMenus', originalCreateMenus);
	}
});

describe('options runtime bootstrap', () => {
	test('installs options shell, globals, guide links, and dedupes module loading', async () => {
		const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
			url: 'https://example.com/options.html',
		});

		setReadonlyGlobal('window', dom.window);
		setReadonlyGlobal('document', dom.window.document);
		setReadonlyGlobal('navigator', dom.window.navigator);
		setReadonlyGlobal('DOMParser', dom.window.DOMParser);
		setReadonlyGlobal('HTMLScriptElement', dom.window.HTMLScriptElement);
		globalThis.browser = undefined;
		globalThis.defaultOptions = undefined;
		globalThis.snipSnipAgentBridgeState = undefined;
		globalThis.snipSnipLibraryState = undefined;
		globalThis.snipSnipOptionsState = undefined;
		globalThis.snipSnipPagePaths = undefined;
		globalThis.snipSnipSiteRules = undefined;
		globalThis.snipSnipTemplateUtils = undefined;
		Reflect.deleteProperty(globalThis, 'snipSnipSearchCore');
		Reflect.deleteProperty(globalThis, 'createMenus');

		const loadMoment = mock(async () => {
			globalThis.moment = originalMoment ?? (() => ({ format: () => '' }));
		});
		const importOptionsSearchModule = mock(async () => ({}));
		const importOptionsRuntimeModule = mock(async () => ({}));

		await Promise.all([
			bootOptionsRuntime({ loadMoment, importOptionsSearchModule, importOptionsRuntimeModule }),
			bootOptionsRuntime({ loadMoment, importOptionsSearchModule, importOptionsRuntimeModule }),
		]);

		expect(document.title).toBe('SnipSnip Options');
		expect(document.getElementById('settings-search')).not.toBeNull();
		expect(document.getElementById('options-fonts-stylesheet')).not.toBeNull();
		expect(document.getElementById('options-shell-stylesheet')).not.toBeNull();
		expect(globalThis.browser).toBeDefined();
		expect(globalThis.defaultOptions).toBeDefined();
		expect(globalThis.snipSnipAgentBridgeState).toBeDefined();
		expect(globalThis.snipSnipLibraryState).toBeDefined();
		expect(globalThis.snipSnipOptionsState).toBeDefined();
		expect(globalThis.snipSnipSiteRules).toBeDefined();
		expect(globalThis.snipSnipTemplateUtils).toBeDefined();
		expect(Reflect.get(globalThis, 'snipSnipSearchCore')).toBeDefined();
		expect(Reflect.get(globalThis, 'createMenus')).toBeDefined();
		const pagePaths = Reflect.get(globalThis, 'snipSnipPagePaths');
		expect(pagePaths).toBeDefined();
		if (pagePaths == null) {
			throw new Error('Expected WXT page paths to be installed');
		}
		expect(Reflect.get(pagePaths, 'guide')).toBe('guide.html');
		expect(Reflect.get(pagePaths, 'options')).toBe('options.html');
		expect((document.getElementById('open-guide-link') as HTMLAnchorElement | null)?.getAttribute('href')).toBe(
			'/guide.html',
		);
		expect(
			(document.querySelector('#search-no-results a') as HTMLAnchorElement | null)?.getAttribute('href'),
		).toBe('/guide.html');
		expect(loadMoment).toHaveBeenCalledTimes(1);
		expect(importOptionsSearchModule).toHaveBeenCalledTimes(1);
		expect(importOptionsRuntimeModule).toHaveBeenCalledTimes(1);
	});
});
