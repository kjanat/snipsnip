import { buildZip, parseUrlList } from '@/lib/batch';
import { describe, expect, test } from 'bun:test';
import { unzipSync } from 'fflate';

describe('parseUrlList', () => {
	test('splits, trims, drops blanks', () => {
		const input = '\nhttps://a.test\n  https://b.test  \n\nhttps://c.test\n';
		expect(parseUrlList(input)).toEqual([
			'https://a.test',
			'https://b.test',
			'https://c.test',
		]);
	});

	test('drops non-http schemes', () => {
		expect(parseUrlList('https://ok.test\nfile:///etc/passwd\nftp://x\n')).toEqual([
			'https://ok.test',
		]);
	});
});

describe('buildZip', () => {
	test('zips entries with their filenames', async () => {
		const blob = buildZip([
			{ filename: 'a.md', markdown: '# A' },
			{ filename: 'b.md', markdown: '# B' },
		]);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const decoded = unzipSync(bytes);
		const decoder = new TextDecoder();
		expect(Object.keys(decoded).sort()).toEqual(['a.md', 'b.md']);
		const aBytes = decoded['a.md'];
		const bBytes = decoded['b.md'];
		if (!aBytes || !bBytes) throw new Error('Expected both entries');
		expect(decoder.decode(aBytes)).toBe('# A');
		expect(decoder.decode(bBytes)).toBe('# B');
	});

	test('disambiguates duplicate filenames', async () => {
		const blob = buildZip([
			{ filename: 'note.md', markdown: 'first' },
			{ filename: 'note.md', markdown: 'second' },
			{ filename: 'note.md', markdown: 'third' },
		]);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const decoded = unzipSync(bytes);
		expect(Object.keys(decoded).sort()).toEqual(['note (1).md', 'note (2).md', 'note.md']);
	});
});
