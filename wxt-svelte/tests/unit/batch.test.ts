import { buildBatchZip, parseUrlList } from '@/lib/batch';
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

describe('buildBatchZip', () => {
	test('zips entries with their filenames', async () => {
		const blob = buildBatchZip([
			{ filename: 'a.md', markdown: '# A', images: [] },
			{ filename: 'b.md', markdown: '# B', images: [] },
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
		const blob = buildBatchZip([
			{ filename: 'note.md', markdown: 'first', images: [] },
			{ filename: 'note.md', markdown: 'second', images: [] },
			{ filename: 'note.md', markdown: 'third', images: [] },
		]);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const decoded = unzipSync(bytes);
		expect(Object.keys(decoded).sort()).toEqual(['note (1).md', 'note (2).md', 'note.md']);
	});

	test('namespaces image paths under per-clip stem', async () => {
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
		const blob = buildBatchZip([
			{
				filename: 'post.md',
				markdown: '![](images/abc.png)',
				images: [
					{
						original: 'x.png',
						resolved: 'https://x/x.png',
						localPath: 'images/abc.png',
						bytes: png,
						mime: 'image/png',
					},
				],
			},
		]);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const decoded = unzipSync(bytes);
		expect(Object.keys(decoded).sort()).toEqual(['post-images/abc.png', 'post.md']);
	});
});
