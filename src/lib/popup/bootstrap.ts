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
	const assetMap: Record<string, string> = {
		'../notifications/notification-host.js': notificationHostScriptUrl,
		'lib/atla-dark.css': new URL('@/popup/lib/atla-dark.css', import.meta.url).href,
		'lib/atla-light.css': new URL('@/popup/lib/atla-light.css', import.meta.url).href,
		'lib/ben10-dark.css': new URL('@/popup/lib/ben10-dark.css', import.meta.url).href,
		'lib/ben10-light.css': new URL('@/popup/lib/ben10-light.css', import.meta.url).href,
		'lib/claude-dark.css': new URL('@/popup/lib/claude-dark.css', import.meta.url).href,
		'lib/claude-light.css': new URL('@/popup/lib/claude-light.css', import.meta.url).href,
		'lib/colorblind-deuteranopia-dark.css':
			new URL('@/popup/lib/colorblind-deuteranopia-dark.css', import.meta.url).href,
		'lib/colorblind-deuteranopia-light.css':
			new URL('@/popup/lib/colorblind-deuteranopia-light.css', import.meta.url).href,
		'lib/colorblind-protanopia-dark.css': new URL('@/popup/lib/colorblind-protanopia-dark.css', import.meta.url).href,
		'lib/colorblind-protanopia-light.css': new URL('@/popup/lib/colorblind-protanopia-light.css', import.meta.url).href,
		'lib/colorblind-tritanopia-dark.css': new URL('@/popup/lib/colorblind-tritanopia-dark.css', import.meta.url).href,
		'lib/colorblind-tritanopia-light.css': new URL('@/popup/lib/colorblind-tritanopia-light.css', import.meta.url).href,
		'lib/dracula.css': new URL('@/popup/lib/dracula.css', import.meta.url).href,
		'lib/github-markdown.css': githubMarkdownCssUrl,
		'lib/material-darker.css': new URL('@/popup/lib/material-darker.css', import.meta.url).href,
		'lib/material.css': new URL('@/popup/lib/material.css', import.meta.url).href,
		// marked is imported directly via npm package now — no asset URL needed
		'lib/monokai.css': new URL('@/popup/lib/monokai.css', import.meta.url).href,
		'lib/nord.css': new URL('@/popup/lib/nord.css', import.meta.url).href,
		'lib/openai-dark.css': new URL('@/popup/lib/openai-dark.css', import.meta.url).href,
		'lib/openai-light.css': new URL('@/popup/lib/openai-light.css', import.meta.url).href,
		'lib/perplexity-dark.css': new URL('@/popup/lib/perplexity-dark.css', import.meta.url).href,
		'lib/perplexity-light.css': new URL('@/popup/lib/perplexity-light.css', import.meta.url).href,
		'lib/solarized.css': new URL('@/popup/lib/solarized.css', import.meta.url).href,
		'lib/twilight.css': new URL('@/popup/lib/twilight.css', import.meta.url).href,
		'lib/xq-dark.css': new URL('@/popup/lib/xq-dark.css', import.meta.url).href,
		'lib/xq-light.css': new URL('@/popup/lib/xq-light.css', import.meta.url).href,
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
				?? (() => import('@/popup/theme-bootstrap.js'));
			const importPopupShortcutsModule = options.importPopupShortcutsModule
				?? (() => import('@/shared/popup-shortcuts.js'));
			const importPopupRuntimeModule = options.importPopupRuntimeModule
				?? (() => import('@/popup/popup.ts'));
			await importThemeBootstrapModule();
			await importPopupShortcutsModule();
			await importPopupRuntimeModule();
		})();
	}

	await popupRuntimeLoadPromise;
}
