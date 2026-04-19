import markdownOptions from '@/shared/markdown-options';
import obsidianUtils from '@/shared/obsidian-utils';
import siteRules from '@/shared/site-rules';
import templateUtils from '@/shared/template-utils';
import urlUtils from '@/shared/url-utils';

import '@/background/apache-mime-types';
import '@/shared/code-block-utils';
import '@/shared/hashtag-utils';
import '@/shared/readability-recovery';
import '@/shared/selection-utils';

import { defaultOptions } from '@/lib/background/default-options-runtime';
import { loadBrowserApi } from '@/lib/vendors/browser-polyfill';
import { loadHighlightApi } from '@/lib/vendors/highlight';
import { loadMomentApi } from '@/lib/vendors/moment';
import { loadReadabilityApi } from '@/lib/vendors/readability';
import { loadTurndownRuntime } from '@/lib/vendors/turndown';

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
		const importModule = options.importModule ?? (() => import('@/offscreen/offscreen'));
		offscreenRuntimeLoadPromise = importModule().then(() => undefined);
	}

	await offscreenRuntimeLoadPromise;
}
