import { extensionFor, extractImageRefs, type ImageBundleEntry, rewriteImageRefs } from '@/lib/images';
import { describe, expect, test } from 'bun:test';

describe('extractImageRefs', () => {
	test('finds standard markdown images', () => {
		const refs = extractImageRefs(
			'![alt](https://x.test/a.png)\n\n![](https://x.test/b.jpg)',
		);
		expect(refs.map((r) => r.resolved)).toEqual([
			'https://x.test/a.png',
			'https://x.test/b.jpg',
		]);
	});

	test('keeps image alt title syntax', () => {
		const refs = extractImageRefs('![alt](https://x.test/a.png "tooltip")');
		expect(refs).toHaveLength(1);
		expect(refs[0]?.resolved).toBe('https://x.test/a.png');
	});

	test('finds obsidian-style embeds', () => {
		const refs = extractImageRefs('![[https://x.test/embed.png]]');
		expect(refs).toHaveLength(1);
		expect(refs[0]?.resolved).toBe('https://x.test/embed.png');
	});

	test('deduplicates by resolved URL', () => {
		const refs = extractImageRefs(
			'![](https://x.test/a.png) and again ![](https://x.test/a.png)',
		);
		expect(refs).toHaveLength(1);
	});

	test('skips data: blob: javascript: about: schemes', () => {
		const refs = extractImageRefs(
			'![](data:image/png;base64,xx)\n![](blob:foo)\n![](javascript:alert(1))\n![](about:blank)',
		);
		expect(refs).toEqual([]);
	});

	test('resolves relative URLs against baseUrl', () => {
		const refs = extractImageRefs('![](/a.png)\n![](b/c.png)', 'https://x.test/dir/page');
		expect(refs.map((r) => r.resolved)).toEqual([
			'https://x.test/a.png',
			'https://x.test/dir/b/c.png',
		]);
	});

	test('drops malformed URLs without baseUrl', () => {
		expect(extractImageRefs('![](/relative.png)')).toEqual([]);
	});
});

describe('extensionFor', () => {
	test('uses MIME mapping when known', () => {
		expect(extensionFor('image/jpeg', 'https://x/a')).toBe('jpg');
		expect(extensionFor('image/png; charset=binary', 'https://x/a')).toBe('png');
		expect(extensionFor('image/svg+xml', 'https://x/a')).toBe('svg');
	});

	test('falls back to URL extension', () => {
		expect(extensionFor('application/octet-stream', 'https://x/a.WEBP')).toBe('webp');
	});

	test('returns bin when nothing recognizable', () => {
		expect(extensionFor('application/octet-stream', 'https://x/path-with-no-ext')).toBe('bin');
	});
});

describe('rewriteImageRefs', () => {
	function entry(original: string, localPath: string): ImageBundleEntry {
		return {
			original,
			resolved: original,
			localPath,
			bytes: new Uint8Array(),
			mime: 'image/png',
		};
	}

	test('replaces every occurrence of the original URL', () => {
		const md = 'see ![](https://x.test/a.png) and ![alt](https://x.test/a.png "title")';
		const out = rewriteImageRefs(md, [entry('https://x.test/a.png', 'images/abc.png')]);
		expect(out).toBe('see ![](images/abc.png) and ![alt](images/abc.png "title")');
	});

	test('escapes regex metacharacters in URLs', () => {
		const md = '![](https://x.test/a+b.png?q=1&z=2)';
		const out = rewriteImageRefs(md, [
			entry('https://x.test/a+b.png?q=1&z=2', 'images/abc.png'),
		]);
		expect(out).toBe('![](images/abc.png)');
	});

	test('leaves markdown untouched when bundle empty', () => {
		const md = '![](https://x.test/a.png)';
		expect(rewriteImageRefs(md, [])).toBe(md);
	});
});
