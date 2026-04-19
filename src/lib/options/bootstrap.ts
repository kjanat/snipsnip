import optionsTemplate from '@/options/options.html?raw';
import agentBridgeState from '@/shared/agent-bridge-state';
import libraryState from '@/shared/library-state';
import optionsState from '@/shared/options-state';
import searchCore from '@/shared/search-core';
import siteRules from '@/shared/site-rules';
import templateUtils from '@/shared/template-utils';

import { createMenus } from '@/lib/background/context-menus-runtime';
import { defaultOptions } from '@/lib/background/default-options-runtime';
import { getGuidePageHref, installWxtPagePaths } from '@/lib/page-paths';
import { loadMomentApi } from '@/lib/vendors/moment';

const fontsCssUrl = new URL('@/shared/fonts.css', import.meta.url).href;
const optionsCssUrl = new URL('@/options/options.css', import.meta.url).href;

let optionsRuntimeLoadPromise: Promise<void> | null = null;

export interface OptionsRuntimeBootstrapOptions {
	importOptionsRuntimeModule?: () => Promise<unknown>;
	importOptionsSearchModule?: () => Promise<unknown>;
	loadMoment?: () => Promise<unknown>;
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

			const loadMoment = options.loadMoment ?? loadMomentApi;
			const importOptionsSearchModule = options.importOptionsSearchModule
				?? (() => import('@/options/options-search'));
			const importOptionsRuntimeModule = options.importOptionsRuntimeModule
				?? (() => import('@/options/options'));

			await loadMoment();
			await importOptionsSearchModule();
			await importOptionsRuntimeModule();
		})();
	}

	await optionsRuntimeLoadPromise;
}
