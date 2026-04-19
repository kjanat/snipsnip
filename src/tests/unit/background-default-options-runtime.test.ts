import { beforeEach, afterEach, describe, expect, test, mock } from 'bun:test';

describe('background default options runtime', () => {
	const originalBrowser = global.browser;
	const originalConsoleError = console.error;
	const originalSiteRules = global.snipSnipSiteRules;
	let defaultOptionsRuntime;

	beforeEach(async () => {
		defaultOptionsRuntime = await import('@/lib/background/default-options-runtime');
	});

	afterEach(() => {
		global.browser = originalBrowser;
		global.snipSnipSiteRules = originalSiteRules;
		console.error = originalConsoleError;
	});

	test('falls back to defaults and contentLink when downloads API is missing', async () => {
		global.browser = {
			storage: {
				sync: {
					get: mock(async () => ({
						frontmatter: defaultOptionsRuntime.LEGACY_DEFAULT_FRONTMATTER,
						siteRules: 'bad-data',
					})),
				},
			},
		};

		global.snipSnipSiteRules = {
			normalizeSiteRules: mock(() => []),
		};

		const options = await defaultOptionsRuntime.getOptions();

		expect(options.frontmatter).toBe(defaultOptionsRuntime.defaultOptions.frontmatter);
		expect(options.siteRules).toEqual([]);
		expect(options.downloadMode).toBe('contentLink');
	});

	test('returns defaults when storage lookup fails', async () => {
		console.error = mock(() => {});
		global.browser = {
			storage: {
				sync: {
					get: mock(async () => {
						throw new Error('boom');
					}),
				},
			},
			downloads: {},
		};

		const options = await defaultOptionsRuntime.getOptions();

		expect(options.title).toBe(defaultOptionsRuntime.defaultOptions.title);
		expect(options.downloadMode).toBe(defaultOptionsRuntime.defaultOptions.downloadMode);
	});
});
