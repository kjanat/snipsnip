const { describe, test, expect, mock, spyOn } = require('bun:test');

/**
 * Tests shared offscreen markdown option normalization helper.
 */

const { createEffectiveMarkdownOptions } = require('../../shared/markdown-options');
const templateUtils = require('../../shared/template-utils');

describe('Offscreen markdown option handling', () => {
	const article = {
		title: 'Article Title',
		pageTitle: 'Doc/Page Title',
		excerpt: 'A summary',
		byline: 'Author Name',
		pageURL: 'https://example.com/docs/page',
		baseURI: 'https://example.com/docs/page',
		keywords: ['docs', 'markdown'],
	};

	test('creates a derived options object without mutating the caller options', () => {
		const originalOptions = {
			includeTemplate: false,
			downloadImages: true,
			frontmatter: 'front',
			backmatter: 'back',
			imagePrefix: '{pageTitle}/assets',
			disallowedChars: '[]#^',
			tableFormatting: {
				stripLinks: true,
				prettyPrint: true,
			},
		};

		const snapshot = JSON.parse(JSON.stringify(originalOptions));
		const derivedOptions = createEffectiveMarkdownOptions(article, originalOptions, false);

		expect(derivedOptions).not.toBe(originalOptions);
		expect(derivedOptions.tableFormatting).not.toBe(originalOptions.tableFormatting);
		expect(derivedOptions.downloadImages).toBe(false);
		expect(derivedOptions.frontmatter).toBe('');
		expect(derivedOptions.backmatter).toBe('');
		expect(derivedOptions.imagePrefix).toBe('DocPage Title/assets');
		expect(originalOptions).toEqual(snapshot);
	});

	test('expands templated fields on the derived copy only', () => {
		const originalOptions = {
			includeTemplate: true,
			downloadImages: false,
			frontmatter: 'title: {pageTitle}',
			backmatter: 'source: {pageURL}',
			imagePrefix: '{pageTitle}/images',
			disallowedChars: '[]#^',
			tableFormatting: {
				stripLinks: true,
			},
		};

		const derivedOptions = createEffectiveMarkdownOptions(article, originalOptions, null);

		expect(derivedOptions.frontmatter).toBe('title: Doc/Page Title\n');
		expect(derivedOptions.backmatter).toBe('\nsource: https://example.com/docs/page');
		expect(derivedOptions.imagePrefix).toBe('DocPage Title/images');
		expect(originalOptions.frontmatter).toBe('title: {pageTitle}');
		expect(originalOptions.backmatter).toBe('source: {pageURL}');
		expect(originalOptions.imagePrefix).toBe('{pageTitle}/images');
	});

	test('honors downloadImages override parameter', () => {
		const originalOptions = {
			includeTemplate: false,
			downloadImages: false,
			frontmatter: '',
			backmatter: '',
			imagePrefix: 'assets/',
			disallowedChars: '',
			tableFormatting: {},
		};

		const derived = createEffectiveMarkdownOptions(article, originalOptions, true);

		expect(derived.downloadImages).toBe(true);
		expect(originalOptions.downloadImages).toBe(false);
		expect(derived.imagePrefix).toBe('assets/');
	});

	test('sanitizes imagePrefix segments via generateValidFileName', () => {
		const spy = spyOn(templateUtils, 'generateValidFileName');
		const options = {
			includeTemplate: false,
			imagePrefix: '{pageTitle}/assets /snapshots',
			disallowedChars: '[]',
			tableFormatting: {},
		};

		const derived = createEffectiveMarkdownOptions(article, options, null);

		expect(spy).toHaveBeenCalled();
		expect(derived.imagePrefix).toContain('assets');
		spy.mockRestore();
	});

	test('supports injected template helpers for callers that want custom replacements', () => {
		const injectedTextReplace = mock((value) => String(value || '').replace('{title}', 'Preloaded'));
		const injectedGenerateValidFileName = mock((value) => value);

		const derived = createEffectiveMarkdownOptions(
			article,
			{
				includeTemplate: true,
				frontmatter: 'title: {title}',
				backmatter: '',
				imagePrefix: '{title}/assets',
				disallowedChars: '',
			},
			null,
			{
				textReplace: injectedTextReplace,
				generateValidFileName: injectedGenerateValidFileName,
			},
		);

		expect(injectedTextReplace).toHaveBeenCalled();
		expect(derived.imagePrefix).toBe('Preloaded/assets');
	});

	test('handles missing tableFormatting without throwing', () => {
		const derived = createEffectiveMarkdownOptions(article, {
			includeTemplate: false,
			imagePrefix: '',
			backmatter: '',
			frontmatter: '',
			disallowedChars: '',
		}, null);

		expect(derived.tableFormatting).toBeUndefined();
	});

	test('falls back to global defaultOptions when no explicit options are provided', () => {
		const originalDefaults = global.defaultOptions;
		global.defaultOptions = {
			includeTemplate: false,
			imagePrefix: 'defaults/',
			disallowedChars: '',
			tableFormatting: {
				prettyPrint: true,
			},
		};

		try {
			const derived = createEffectiveMarkdownOptions(article, null, null);
			expect(derived.imagePrefix).toBe('defaults/');
			expect(derived.tableFormatting).toEqual({ prettyPrint: true });
		} finally {
			global.defaultOptions = originalDefaults;
		}
	});

	test('returns safe defaults when neither explicit options nor defaultOptions exist', () => {
		const originalDefaults = global.defaultOptions;
		delete global.defaultOptions;

		try {
			const derived = createEffectiveMarkdownOptions(article, null, null);
			expect(derived.frontmatter).toBe('');
			expect(derived.backmatter).toBe('');
			expect(derived.imagePrefix).toBe('');
			expect(derived.tableFormatting).toBeUndefined();
		} finally {
			global.defaultOptions = originalDefaults;
		}
	});

	test('uses bundled template utils when no injected helper is provided', () => {
		const fallbackArticle = {
			title: 'Fallback Title',
			pageURL: 'https://fallback.test/page',
			baseURI: 'https://fallback.test',
			keywords: ['fallback'],
		};

		const derived = createEffectiveMarkdownOptions(fallbackArticle, {
			includeTemplate: true,
			frontmatter: 'title: {title}',
			backmatter: 'source: {pageURL}',
			imagePrefix: '{title}/assets',
			disallowedChars: '[]',
		}, null);

		expect(derived.frontmatter).toBe('title: Fallback Title\n');
		expect(derived.imagePrefix).toContain('Fallback Title/assets');
	});

	test('uses injected helpers when callers provide them', () => {
		const injectedTextReplace = mock((value) => String(value || '').replace('{pageTitle}', 'Injected Title'));
		const injectedGenerateValidFileName = mock((value) => value);

		const derived = createEffectiveMarkdownOptions(
			article,
			{
				includeTemplate: true,
				frontmatter: 'title: {pageTitle}',
				backmatter: 'source: {pageTitle}',
				imagePrefix: '{pageTitle}/images',
				disallowedChars: '',
				tableFormatting: {},
			},
			null,
			{
				textReplace: injectedTextReplace,
				generateValidFileName: injectedGenerateValidFileName,
			},
		);

		expect(injectedTextReplace).toHaveBeenCalled();
		expect(derived.frontmatter).toBe('title: Injected Title\n');
		expect(derived.imagePrefix).toBe('Injected Title/images');
	});

	test('supports inert injected helpers for callers that want no-op transforms', () => {
		const derived = createEffectiveMarkdownOptions(
			article,
			{
				includeTemplate: true,
				frontmatter: 'front',
				backmatter: 'back',
				imagePrefix: 'images/',
				disallowedChars: '',
				tableFormatting: {},
			},
			null,
			{
				textReplace: (value) => String(value || ''),
				generateValidFileName: (value) => String(value || ''),
			},
		);

		expect(derived.frontmatter).toBe('front\n');
		expect(derived.backmatter).toBe('\nback');
		expect(derived.imagePrefix).toBe('images/');
	});
});
