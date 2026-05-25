import guideTemplate from '@/guide/guide.html?raw';
import { defaultOptions } from '@/lib/background/default-options-runtime.ts';
import { installWxtPagePaths } from '@/lib/page-paths.ts';
// Process fonts.css through Vite so woff2 files are emitted + url()s rewritten.
import '@/shared/fonts.css';
import searchCore from '@/shared/search-core.ts';

const guideCssUrl = new URL('@/guide/guide.css', import.meta.url).href;
let guideRuntimeLoadPromise: Promise<void> | null = null;

export interface GuideRuntimeBootstrapOptions {
	importModule?: () => Promise<unknown>;
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
	globalThis.defaultOptions ??= defaultOptions;
	Reflect.set(globalThis, 'snipSnipSearchCore', Reflect.get(globalThis, 'snipSnipSearchCore') ?? searchCore);
}

function installGuideStyles(): void {
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

export function resetGuideRuntimeBootstrapState(): void {
	guideRuntimeLoadPromise = null;
}

export async function bootGuideRuntime(options: GuideRuntimeBootstrapOptions = {}): Promise<void> {
	if (!guideRuntimeLoadPromise) {
		guideRuntimeLoadPromise = (async () => {
			installGuideGlobals();
			installGuideStyles();
			installGuideShell(options.loadTemplate ?? (() => guideTemplate));

			const importModule = options.importModule ?? (() => import('@/guide/guide.ts'));
			await importModule();
		})();
	}

	await guideRuntimeLoadPromise;
}
