import { getGuidePageHref, getOptionsPageHref, installWxtPagePaths } from '@/lib/page-paths.ts';
import popupTemplate from '@/popup/popup.html?raw';
import agentBridgeState from '@/shared/agent-bridge-state.ts';
import countUtils from '@/shared/count-utils.ts';
import libraryState from '@/shared/library-state.ts';
import obsidianUtils from '@/shared/obsidian-utils.ts';
import optionsState from '@/shared/options-state.ts';
import popupBatchUtils from '@/shared/popup-batch-utils.ts';

const fontsCssUrl = new URL('@/shared/fonts.css', import.meta.url).href;
const popupCssUrl = new URL('@/popup/popup.css', import.meta.url).href;
const notificationHostScriptUrl = browser.runtime.getURL('/notifications/notification-host.js');

let popupRuntimeLoadPromise: Promise<void> | null = null;

export interface PopupRuntimeBootstrapOptions {
	importPopupShortcutsModule?: () => Promise<unknown>;
	importPopupRuntimeModule?: () => Promise<unknown>;
	importThemeBootstrapModule?: () => Promise<unknown>;
	loadTemplate?: () => string;
}

function buildPopupAssetMap(): Record<string, string> {
	const githubMarkdownCssUrl = new URL('@/popup/lib/github-markdown.css', import.meta.url).href;
	// All CM5 theme CSS files were removed — themes now ship as CM6 JS extensions via
	// src/popup/lib/themes/*.ts. marked + moment + turndown/etc. are npm imports.
	const assetMap: Record<string, string> = {
		'../notifications/notification-host.js': notificationHostScriptUrl,
		'lib/github-markdown.css': githubMarkdownCssUrl,
		'popup/lib/github-markdown.css': githubMarkdownCssUrl,
		'print/print.css': new URL('@/print/print.css', import.meta.url).href,
	};

	return assetMap;
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

function installPopupGlobals(): void {
	installWxtPagePaths();
	globalThis.snipSnipAgentBridgeState ??= agentBridgeState;
	globalThis.snipSnipLibraryState ??= libraryState;
	globalThis.snipSnipObsidian ??= obsidianUtils;
	Reflect.set(globalThis, 'snipSnipCountUtils', Reflect.get(globalThis, 'snipSnipCountUtils') ?? countUtils);
	Reflect.set(globalThis, 'snipSnipOptionsState', Reflect.get(globalThis, 'snipSnipOptionsState') ?? optionsState);
	globalThis.snipSnipPopupAssets ??= buildPopupAssetMap();
	Reflect.set(
		globalThis,
		'snipSnipPopupBatchUtils',
		Reflect.get(globalThis, 'snipSnipPopupBatchUtils') ?? popupBatchUtils,
	);
}

function syncPopupPageLinks(): void {
	const guideLink = document.getElementById('guideLink');
	if (guideLink instanceof HTMLAnchorElement) {
		guideLink.href = getGuidePageHref();
	}

	const optionsLink = document.getElementById('options');
	if (optionsLink instanceof HTMLAnchorElement) {
		optionsLink.href = getOptionsPageHref();
	}
}

function installPopupStyles(): void {
	appendStylesheet(fontsCssUrl, 'popup-fonts-stylesheet');
	appendStylesheet(popupCssUrl, 'popup-shell-stylesheet');
}

function installPopupShell(loadTemplate: () => string): void {
	const parsedTemplate = new DOMParser().parseFromString(loadTemplate(), 'text/html');
	parsedTemplate.querySelectorAll('script').forEach((element) => {
		element.remove();
	});

	const className = parsedTemplate.documentElement.getAttribute('class');
	if (className == null) {
		document.documentElement.removeAttribute('class');
	} else {
		document.documentElement.className = className;
	}

	document.title = parsedTemplate.title || 'SnipSnip';
	document.body.replaceChildren(
		...Array.from(parsedTemplate.body.childNodes).map((node) => document.importNode(node, true)),
	);
}

export function resetPopupRuntimeBootstrapState(): void {
	popupRuntimeLoadPromise = null;
}

export async function bootPopupRuntime(options: PopupRuntimeBootstrapOptions = {}): Promise<void> {
	if (!popupRuntimeLoadPromise) {
		popupRuntimeLoadPromise = (async () => {
			installPopupGlobals();
			installPopupStyles();
			installPopupShell(options.loadTemplate ?? (() => popupTemplate));
			syncPopupPageLinks();

			const importThemeBootstrapModule = options.importThemeBootstrapModule
				?? (() => import('@/popup/theme-bootstrap.ts'));
			const importPopupShortcutsModule = options.importPopupShortcutsModule
				?? (() => import('@/shared/popup-shortcuts.ts'));
			const importPopupRuntimeModule = options.importPopupRuntimeModule
				?? (() => import('@/popup/popup.ts'));
			await importThemeBootstrapModule();
			await importPopupShortcutsModule();
			await importPopupRuntimeModule();
		})();
	}

	await popupRuntimeLoadPromise;
}
