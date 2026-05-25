import { afterEach, describe, expect, mock, test } from 'bun:test';

import { bootOffscreenRuntime } from '@/lib/offscreen/bootstrap';

const originalBrowser = globalThis.browser;
const originalDefaultOptions = globalThis.defaultOptions;
const originalHighlight = globalThis.hljs;
const originalMoment = globalThis.moment;
const originalMarkdownOptions = globalThis.snipSnipMarkdownOptions;
const originalSiteRules = globalThis.snipSnipSiteRules;
const originalTemplateUtils = globalThis.snipSnipTemplateUtils;
const originalTurndownPluginGfm = globalThis.turndownPluginGfm;
const originalTurndownService = globalThis.TurndownService;
const originalUrlUtils = globalThis.snipSnipUrlUtils;
const originalReadability = globalThis.Readability;
const originalObsidian = Reflect.get(globalThis, 'snipSnipObsidian');

afterEach(() => {
	globalThis.browser = originalBrowser;
	globalThis.defaultOptions = originalDefaultOptions;
	globalThis.hljs = originalHighlight;
	globalThis.moment = originalMoment;
	globalThis.snipSnipMarkdownOptions = originalMarkdownOptions;
	globalThis.snipSnipSiteRules = originalSiteRules;
	globalThis.snipSnipTemplateUtils = originalTemplateUtils;
	globalThis.turndownPluginGfm = originalTurndownPluginGfm;
	globalThis.TurndownService = originalTurndownService;
	globalThis.snipSnipUrlUtils = originalUrlUtils;
	globalThis.Readability = originalReadability;

	if (originalObsidian == null) {
		Reflect.deleteProperty(globalThis, 'snipSnipObsidian');
	} else {
		Reflect.set(globalThis, 'snipSnipObsidian', originalObsidian);
	}
});

describe('offscreen runtime bootstrap', () => {
	test('installs globals and dedupes legacy runtime loading', async () => {
		globalThis.browser = undefined;
		globalThis.defaultOptions = undefined;
		globalThis.hljs = undefined;
		globalThis.moment = undefined;
		globalThis.snipSnipMarkdownOptions = undefined;
		globalThis.snipSnipSiteRules = undefined;
		globalThis.snipSnipTemplateUtils = undefined;
		globalThis.TurndownService = undefined;
		globalThis.turndownPluginGfm = undefined;
		globalThis.snipSnipUrlUtils = undefined;
		globalThis.Readability = undefined;
		Reflect.deleteProperty(globalThis, 'snipSnipObsidian');

		const loadVendors = mock(async () => {
			globalThis.browser = originalBrowser ?? { storage: {} };
			globalThis.hljs = originalHighlight ?? { highlightAuto: () => ({ language: '', relevance: 0 }) };
			globalThis.moment = originalMoment ?? (() => ({ format: () => '' }));
			globalThis.Readability = originalReadability ?? class FakeReadability {
				parse() {
					return null;
				}
			};
			globalThis.TurndownService = originalTurndownService ?? class FakeTurndownService {
				escape(text: string) {
					return text;
				}

				addRule() {}

				use() {}

				turndown() {
					return '';
				}
			};
			globalThis.turndownPluginGfm = originalTurndownPluginGfm ?? {
				highlightedCodeBlock: Symbol('highlightedCodeBlock'),
				strikethrough: Symbol('strikethrough'),
				taskListItems: Symbol('taskListItems'),
			};
		});
		const importModule = mock(async () => ({}));

		await Promise.all([
			bootOffscreenRuntime({ loadVendors, importModule }),
			bootOffscreenRuntime({ loadVendors, importModule }),
		]);

		expect(globalThis.browser).toBeDefined();
		expect(globalThis.defaultOptions).toBeDefined();
		expect(globalThis.hljs).toBeDefined();
		expect(globalThis.moment).toBeDefined();
		expect(globalThis.snipSnipMarkdownOptions).toBeDefined();
		expect(globalThis.snipSnipSiteRules).toBeDefined();
		expect(globalThis.snipSnipTemplateUtils).toBeDefined();
		expect(globalThis.snipSnipUrlUtils).toBeDefined();
		expect(Reflect.get(globalThis, 'snipSnipObsidian')).toBeDefined();
		expect(loadVendors).toHaveBeenCalledTimes(2);
		expect(importModule).toHaveBeenCalledTimes(1);
	});
});
