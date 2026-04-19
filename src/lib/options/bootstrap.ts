import browserApi from '../../browser-polyfill.min.js';
import optionsTemplate from '../../options/options.html?raw';
import agentBridgeState from '../../shared/agent-bridge-state.ts';
import libraryState from '../../shared/library-state.ts';
import optionsState from '../../shared/options-state.ts';
import searchCore from '../../shared/search-core.ts';
import siteRules from '../../shared/site-rules.ts';
import templateUtils from '../../shared/template-utils.ts';

import { createMenus } from '../background/context-menus-runtime.js';
import { defaultOptions } from '../background/default-options-runtime.js';
import { getGuidePageHref, installWxtPagePaths } from '../page-paths.ts';

const fontsCssUrl = new URL('../../shared/fonts.css', import.meta.url).href;
const momentScriptUrl = new URL('../../background/moment.min.js', import.meta.url).href;
const optionsCssUrl = new URL('../../options/options.css', import.meta.url).href;
const optionsSearchScriptUrl = new URL('../../options/options-search.js', import.meta.url).href;
const optionsRuntimeScriptUrl = new URL('../../options/options.js', import.meta.url).href;

let optionsRuntimeLoadPromise: Promise<void> | null = null;

export interface OptionsRuntimeBootstrapOptions {
	loadScript?: (src: string, id?: string) => Promise<unknown>;
	loadTemplate?: () => string;
}

function appendStylesheet(href: string, id: string): void {
	if (document.getElementById(id) != null) {
		return;
	}

	const link = document.createElement('link');
	link.id = id;
	link.rel = 'stylesheet';
	link.href = href;
	document.head.appendChild(link);
}

function installOptionsGlobals(): void {
	installWxtPagePaths();
	globalThis.browser ??= browserApi;
	globalThis.defaultOptions ??= defaultOptions;
	globalThis.snipSnipAgentBridgeState ??= agentBridgeState;
	globalThis.snipSnipLibraryState ??= libraryState;
	Reflect.set(globalThis, 'snipSnipOptionsState', Reflect.get(globalThis, 'snipSnipOptionsState') ?? optionsState);
	Reflect.set(globalThis, 'snipSnipSearchCore', Reflect.get(globalThis, 'snipSnipSearchCore') ?? searchCore);
	globalThis.snipSnipSiteRules ??= siteRules;
	globalThis.snipSnipTemplateUtils ??= templateUtils;
	Reflect.set(globalThis, 'createMenus', Reflect.get(globalThis, 'createMenus') ?? createMenus);
}

function installOptionsStyles(): void {
	appendStylesheet(fontsCssUrl, 'options-fonts-stylesheet');
	appendStylesheet(optionsCssUrl, 'options-shell-stylesheet');
}

function installOptionsShell(loadTemplate: () => string): void {
	const parsedTemplate = new DOMParser().parseFromString(loadTemplate(), 'text/html');
	parsedTemplate.querySelectorAll('script').forEach((element) => {
		element.remove();
	});

	document.title = parsedTemplate.title || 'SnipSnip Options';
	document.body.replaceChildren(
		...Array.from(parsedTemplate.body.childNodes).map((node) => document.importNode(node, true)),
	);
}

function syncGuideLinks(): void {
	document.querySelectorAll('a[href="/guide/guide.html"]').forEach((element) => {
		if (element instanceof HTMLAnchorElement) {
			element.href = getGuidePageHref();
		}
	});
}

function loadClassicScript(src: string, id?: string): Promise<HTMLScriptElement> {
	if (id != null) {
		const existingById = document.getElementById(id);
		if (existingById instanceof HTMLScriptElement) {
			return Promise.resolve(existingById);
		}
	}

	const existing = Array.from(document.querySelectorAll('script[src]')).find((script) =>
		script.getAttribute('src') === src
	);
	if (existing instanceof HTMLScriptElement) {
		return Promise.resolve(existing);
	}

	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.type = 'application/javascript';
		script.src = src;
		if (id != null) {
			script.id = id;
		}
		script.addEventListener('load', () => resolve(script), { once: true });
		script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
		document.body.appendChild(script);
	});
}

export function resetOptionsRuntimeBootstrapState(): void {
	optionsRuntimeLoadPromise = null;
}

export async function bootOptionsRuntime(options: OptionsRuntimeBootstrapOptions = {}): Promise<void> {
	if (!optionsRuntimeLoadPromise) {
		optionsRuntimeLoadPromise = (async () => {
			installOptionsGlobals();
			installOptionsStyles();
			installOptionsShell(options.loadTemplate ?? (() => optionsTemplate));
			syncGuideLinks();

			const loadScript = options.loadScript ?? loadClassicScript;
			await loadScript(momentScriptUrl, 'options-moment-script');
			await loadScript(optionsSearchScriptUrl, 'options-search-script');
			await loadScript(optionsRuntimeScriptUrl, 'options-runtime-script');
		})();
	}

	await optionsRuntimeLoadPromise;
}
