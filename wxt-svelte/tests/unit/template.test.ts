import { applyTemplate } from '@/lib/template';
import type { ExtractedArticle } from '@/lib/types';
import { describe, expect, test } from 'bun:test';

const article: ExtractedArticle = {
	title: 'Hello World',
	byline: 'Ada Lovelace',
	excerpt: 'A short summary.',
	content: '<p>body</p>',
	textContent: 'body',
	siteName: 'Example',
	lang: 'en',
	publishedTime: '2026-04-22T05:00:00Z',
	url: 'https://example.test/post',
	hash: 'abc123def456',
};

describe('applyTemplate', () => {
	test('substitutes article tokens', () => {
		const out = applyTemplate(
			'# {pageTitle}\nby {byline} on {siteName}\nsource: {baseURI}\n',
			article,
		);
		expect(out).toContain('# Hello World');
		expect(out).toContain('by Ada Lovelace on Example');
		expect(out).toContain('source: https://example.test/post');
	});

	test('substitutes excerpt + hash', () => {
		const out = applyTemplate('{excerpt} ({hash})', article);
		expect(out).toBe('A short summary. (abc123def456)');
	});

	test('renders date tokens', () => {
		const out = applyTemplate('{date:YYYY-MM-DD}', article);
		expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	test('handles missing optional fields as empty string', () => {
		const minimal: ExtractedArticle = { ...article, byline: null, publishedTime: null };
		expect(applyTemplate('by={byline} when={publishedTime}', minimal)).toBe('by= when=');
	});
});
