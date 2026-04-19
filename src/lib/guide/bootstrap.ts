import browserApi from '../../browser-polyfill.min.js';
import guideTemplate from '../../guide/guide.html?raw';
import searchCore from '../../shared/search-core.ts';

import { defaultOptions } from '../background/default-options-runtime.js';
import { installWxtPagePaths } from '../page-paths.ts';

const fontsCssUrl = new URL('../../shared/fonts.css', import.meta.url).href;
const guideCssUrl = new URL('../../guide/guide.css', import.meta.url).href;
const guideRuntimeScriptUrl = new URL('../../guide/guide.js', import.meta.url).href;

let guideRuntimeLoadPromise: Promise<void> | null = null;

export interface GuideRuntimeBootstrapOptions {
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

function installGuideGlobals(): void {
	installWxtPagePaths();
	globalThis.browser ??= browserApi;
	globalThis.defaultOptions ??= defaultOptions;
	Reflect.set(globalThis, 'snipSnipSearchCore', Reflect.get(globalThis, 'snipSnipSearchCore') ?? searchCore);
}

function installGuideStyles(): void {
	appendStylesheet(fontsCssUrl, 'guide-fonts-stylesheet');
	appendStylesheet(guideCssUrl, 'guide-shell-stylesheet');
}

function installGuideShell(loadTemplate: () => string): void {
	const parsedTemplate = new DOMParser().parseFromString(loadTemplate(), 'text/html');
	parsedTemplate.querySelectorAll('script').forEach((element) => {
		element.remove();
	});

	document.title = parsedTemplate.title || 'SnipSnip User Guide';
	document.body.replaceChildren(
		...Array.from(parsedTemplate.body.childNodes).map((node) => document.importNode(node, true)),
	);
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

export function resetGuideRuntimeBootstrapState(): void {
	guideRuntimeLoadPromise = null;
}

export async function bootGuideRuntime(options: GuideRuntimeBootstrapOptions = {}): Promise<void> {
	if (!guideRuntimeLoadPromise) {
		guideRuntimeLoadPromise = (async () => {
			installGuideGlobals();
			installGuideStyles();
			installGuideShell(options.loadTemplate ?? (() => guideTemplate));

			const loadScript = options.loadScript ?? loadClassicScript;
			await loadScript(guideRuntimeScriptUrl, 'guide-runtime-script');
		})();
	}

	await guideRuntimeLoadPromise;
}
