import markdownOptions from '@/shared/markdown-options.ts';
import obsidianUtils from '@/shared/obsidian-utils.ts';
import siteRules from '@/shared/site-rules.ts';
import templateUtils from '@/shared/template-utils.ts';
import urlUtils from '@/shared/url-utils.ts';

import '@/background/apache-mime-types.js';
import '@/shared/code-block-utils.js';
import '@/shared/hashtag-utils.js';
import '@/shared/readability-recovery.js';
import '@/shared/selection-utils.js';

import { defaultOptions } from '@/lib/background/default-options-runtime.ts';
import { loadBrowserApi } from '@/lib/vendors/browser-polyfill.ts';
import { loadHighlightApi } from '@/lib/vendors/highlight.ts';
import { loadMomentApi } from '@/lib/vendors/moment.ts';
import { loadReadabilityApi } from '@/lib/vendors/readability.ts';
import { loadTurndownRuntime } from '@/lib/vendors/turndown.ts';

let offscreenRuntimeLoadPromise: Promise<void> | null = null;

export interface OffscreenRuntimeBootstrapOptions {
	loadVendors?: () => Promise<unknown>;
	importModule?: () => Promise<unknown>;
}

function installOffscreenGlobals(): void {
	globalThis.defaultOptions ??= defaultOptions;
	globalThis.snipSnipSiteRules ??= siteRules;
	globalThis.snipSnipTemplateUtils ??= templateUtils;
	globalThis.snipSnipUrlUtils ??= urlUtils;

	if (Reflect.get(globalThis, 'snipSnipMarkdownOptions') == null) {
		Reflect.set(globalThis, 'snipSnipMarkdownOptions', markdownOptions);
	}

	if (Reflect.get(globalThis, 'snipSnipObsidian') == null) {
		Reflect.set(globalThis, 'snipSnipObsidian', obsidianUtils);
	}
}

export async function bootOffscreenRuntime(options: OffscreenRuntimeBootstrapOptions = {}): Promise<void> {
	installOffscreenGlobals();

	const loadVendors = options.loadVendors
		?? (() =>
			Promise.all([
				loadBrowserApi(),
				loadHighlightApi(),
				loadMomentApi(),
				loadReadabilityApi(),
				loadTurndownRuntime(),
			]));

	await loadVendors();

	if (!offscreenRuntimeLoadPromise) {
		const importModule = options.importModule ?? (() => import('@/offscreen/offscreen.js'));
		offscreenRuntimeLoadPromise = importModule().then(() => undefined);
	}

	await offscreenRuntimeLoadPromise;
}
