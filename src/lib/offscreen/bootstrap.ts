import markdownOptions from '@/shared/markdown-options.ts';
import obsidianUtils from '@/shared/obsidian-utils.ts';
import siteRules from '@/shared/site-rules.ts';
import templateUtils from '@/shared/template-utils.ts';
import urlUtils from '@/shared/url-utils.ts';

// Side-effect imports: these populate `globalThis.*` for the legacy offscreen
// code that still reads globals (apache-mime-types, readability-recovery, etc.).
import '@/background/apache-mime-types.ts';
import '@/shared/code-block-utils.ts';
import '@/shared/hashtag-utils.ts';
import '@/shared/readability-recovery.ts';
import '@/shared/selection-utils.ts';

// Vendor loaders are now thin npm-import shims. They still set `globalThis.hljs`,
// `globalThis.moment`, `globalThis.TurndownService`, `globalThis.Readability`,
// `globalThis.turndownPluginGfm` at module-init time for any legacy consumer,
// but offscreen.ts imports them directly from npm now.
import '@/lib/vendors/browser-polyfill.ts';
import '@/lib/vendors/highlight.ts';
import '@/lib/vendors/moment.ts';
import '@/lib/vendors/readability.ts';
import '@/lib/vendors/turndown.ts';

import { defaultOptions } from '@/lib/background/default-options-runtime.ts';

let offscreenRuntimeLoadPromise: Promise<void> | null = null;

export interface OffscreenRuntimeBootstrapOptions {
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

	if (!offscreenRuntimeLoadPromise) {
		const importModule = options.importModule ?? (() => import('@/offscreen/offscreen.ts'));
		offscreenRuntimeLoadPromise = importModule().then(() => undefined);
	}

	await offscreenRuntimeLoadPromise;
}
