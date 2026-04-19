import { afterEach, describe, expect, mock, test } from 'bun:test';

import { getBrowserApi, loadBrowserApi } from '@/lib/vendors/browser-polyfill';
import { getHighlightApi, loadHighlightApi } from '@/lib/vendors/highlight';
import { getMomentApi, loadMomentApi } from '@/lib/vendors/moment';
import { getReadabilityApi, loadReadabilityApi } from '@/lib/vendors/readability';
import { getTurndownRuntime, loadTurndownRuntime } from '@/lib/vendors/turndown';

const originalBrowser = globalThis.browser;
const originalHighlight = globalThis.hljs;
const originalMoment = globalThis.moment;
const originalReadability = globalThis.Readability;
const originalTurndownService = globalThis.TurndownService;
const originalTurndownPluginGfm = globalThis.turndownPluginGfm;

afterEach(() => {
	globalThis.browser = originalBrowser;
	globalThis.hljs = originalHighlight;
	globalThis.moment = originalMoment;
	globalThis.Readability = originalReadability;
	globalThis.TurndownService = originalTurndownService;
	globalThis.turndownPluginGfm = originalTurndownPluginGfm;
});

describe('vendor runtime wrappers', () => {
	test('browser wrapper reuses an existing browser global', async () => {
		const browserApi = { storage: { local: { get: async () => ({}) } } };
		const importModule = mock(async () => ({ default: { storage: { local: { get: async () => ({}) } } } }));
		globalThis.browser = browserApi;

		expect(getBrowserApi()).toBe(browserApi);
		expect(await loadBrowserApi({ importModule })).toBe(browserApi);
		expect(importModule).not.toHaveBeenCalled();
	});

	test('moment wrapper installs a default export exactly once across concurrent loads', async () => {
		globalThis.moment = undefined;
		const momentApi = mock((value?: Date | number | string | null) => ({
			format: () => String(value ?? 'now'),
		}));
		const importModule = mock(async () => ({ default: momentApi }));

		const [first, second] = await Promise.all([
			loadMomentApi({ importModule }),
			loadMomentApi({ importModule }),
		]);

		expect(first).toBe(momentApi);
		expect(second).toBe(momentApi);
		expect(getMomentApi()).toBe(momentApi);
		expect(importModule).toHaveBeenCalledTimes(1);
	});

	test('highlight wrapper installs the default export', async () => {
		globalThis.hljs = undefined;
		const highlightApi = {
			highlightAuto: mock(() => ({ language: 'ts', relevance: 12 })),
			getLanguage: mock(() => ({})),
		};

		expect(await loadHighlightApi({ importModule: async () => ({ default: highlightApi }) })).toBe(highlightApi);
		expect(getHighlightApi()).toBe(highlightApi);
	});

	test('readability wrapper installs a constructor default export', async () => {
		globalThis.Readability = undefined;

		class FakeReadability {
			parse() {
				return {
					title: 'Article',
					content: '<p>hello</p>',
				};
			}
		}

		const readabilityApi = await loadReadabilityApi({
			importModule: async () => ({ default: FakeReadability }),
		});

		expect(readabilityApi).toBe(FakeReadability);
		expect(getReadabilityApi()).toBe(FakeReadability);
	});

	test('turndown wrapper installs constructor and GFM plugin exports', async () => {
		globalThis.TurndownService = undefined;
		globalThis.turndownPluginGfm = undefined;

		class FakeTurndownService {
			escape(text: string) {
				return text;
			}

			use() {}

			addRule() {}

			turndown() {
				return '';
			}
		}

		const turndownPluginGfm = {
			highlightedCodeBlock: Symbol('highlightedCodeBlock'),
			strikethrough: Symbol('strikethrough'),
			taskListItems: Symbol('taskListItems'),
		};

		const runtime = await loadTurndownRuntime({
			importTurndownServiceModule: async () => ({ default: FakeTurndownService }),
			importTurndownPluginGfmModule: async () => turndownPluginGfm,
		});

		expect(runtime.TurndownService).toBe(FakeTurndownService);
		expect(runtime.turndownPluginGfm).toBe(turndownPluginGfm);
		expect(getTurndownRuntime()).toEqual(runtime);
	});
});
