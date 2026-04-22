import { type ClipEntry, searchLibrary } from '@/lib/library';
import { describe, expect, test } from 'bun:test';

const sample: ClipEntry[] = [
	{
		id: '1',
		url: 'https://docs.example.test/intro',
		title: 'Introduction to Foo',
		byline: 'Ada Lovelace',
		siteName: 'Example Docs',
		filename: 'intro.md',
		markdown: '# Intro\nFooBar baz',
		mode: 'document',
		savedAt: 1,
	},
	{
		id: '2',
		url: 'https://blog.example.test/news',
		title: 'Weekly News',
		byline: null,
		siteName: 'Example Blog',
		filename: 'news.md',
		markdown: '# News\nBaz qux',
		mode: 'document',
		savedAt: 2,
	},
];

describe('searchLibrary', () => {
	test('returns all when query empty', () => {
		expect(searchLibrary(sample, '')).toEqual(sample);
		expect(searchLibrary(sample, '   ')).toEqual(sample);
	});

	test('matches title case-insensitively', () => {
		expect(searchLibrary(sample, 'INTRO').map((e) => e.id)).toEqual(['1']);
	});

	test('matches URL', () => {
		expect(searchLibrary(sample, 'blog.example').map((e) => e.id)).toEqual(['2']);
	});

	test('matches body', () => {
		expect(searchLibrary(sample, 'foobar').map((e) => e.id)).toEqual(['1']);
	});

	test('matches byline', () => {
		expect(searchLibrary(sample, 'Ada').map((e) => e.id)).toEqual(['1']);
	});

	test('returns empty when no match', () => {
		expect(searchLibrary(sample, 'no-such-thing')).toEqual([]);
	});
});
