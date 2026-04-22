import { sanitizeFilename, withMarkdownExtension } from '@/lib/filename';
import { describe, expect, test } from 'bun:test';

describe('sanitizeFilename', () => {
	test('strips reserved characters', () => {
		expect(sanitizeFilename('a/b\\c:d*e?f<g>h"i|j')).toBe('abcdefghij');
	});

	test('collapses whitespace', () => {
		expect(sanitizeFilename('  hello   world  ')).toBe('hello world');
	});

	test('strips control characters', () => {
		expect(sanitizeFilename('hithere')).toBe('hithere');
	});

	test('returns fallback when input is empty', () => {
		expect(sanitizeFilename('   ')).toBe('clip');
		expect(sanitizeFilename('?/\\*', 'note')).toBe('note');
	});
});

describe('withMarkdownExtension', () => {
	test('adds .md when missing', () => {
		expect(withMarkdownExtension('article')).toBe('article.md');
	});

	test('keeps .md when present', () => {
		expect(withMarkdownExtension('Article.MD')).toBe('Article.MD');
	});
});
