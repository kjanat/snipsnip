import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { getImageFilename, resolveArticleUrl, safeParseUrl, validateUri } from '@/shared/url-utils';

describe('URL utils', () => {
	describe('safeParseUrl', () => {
		test('returns URL instance for valid URLs', () => {
			const parsed = safeParseUrl('https://example.com/page');
			expect(parsed).toBeInstanceOf(URL);
			expect(parsed.hostname).toBe('example.com');
		});

		test('returns null for invalid URLs', () => {
			expect(safeParseUrl('://bad')).toBeNull();
			expect(safeParseUrl('')).toBeNull();
		});
	});

	describe('resolveArticleUrl', () => {
		test('prefers explicit page url when valid', () => {
			const resolved = resolveArticleUrl('https://example.com/base', 'https://example.com/real');
			expect(resolved.href).toBe('https://example.com/real');
		});

		test('falls back to dom base when page url is empty', () => {
			const resolved = resolveArticleUrl('https://example.com/base', '');
			expect(resolved.href).toBe('https://example.com/base');
		});
	});

	describe('validateUri', () => {
		const base = 'https://example.com/folder/';

		test('keeps absolute URLs unchanged', () => {
			expect(validateUri('https://example.com/image.png', base)).toBe('https://example.com/image.png');
		});

		test('resolves root-relative paths', () => {
			const result = validateUri('/assets/pic.jpg', base);
			expect(result).toBe('https://example.com/assets/pic.jpg');
		});

		test('resolves relative paths without leading slash', () => {
			const result = validateUri('images/photo.png', base);
			expect(result).toBe('https://example.com/folder/images/photo.png');
		});
	});

	describe('getImageFilename', () => {
		let generateValidFileName;

		beforeEach(() => {
			generateValidFileName = mock((value) => value.replace(/\s+/g, '-'));
		});

		test('prefixes filename using title segments and options', () => {
			const options = {
				title: 'Repo/Notes',
				imagePrefix: 'gallery/',
				disallowedChars: '#[]',
			};
			const filename = getImageFilename('https://example.com/path/image.png?foo=1', options, true, {
				generateValidFileName,
			});

			expect(filename).toContain('Repo/gallery/');
			expect(generateValidFileName).toHaveBeenCalled();
			expect(filename).toMatch(/image\.png$/);
		});

		test('handles base64 data URIs and missing extension', () => {
			const options = { title: 'Clips/Batch' };
			const filename = getImageFilename('https://example.com/path/image;base64,abc', options);

			expect(filename).toContain('image.image');
			expect(filename).toContain('Clips/');
		});

		test('skips prefix when prependFilePath is false', () => {
			const options = {
				title: 'Notes',
				imagePrefix: 'pics/',
			};
			const filename = getImageFilename('https://example.com/photo.jpg', options, false, {
				generateValidFileName,
			});

			expect(filename).toBe('pics/photo.jpg');
			expect(generateValidFileName).toHaveBeenCalledWith('photo.jpg', null);
		});

		test('adds fallback extension when the source lacks a dot', () => {
			const options = { title: 'Folder' };
			const filename = getImageFilename('https://example.com/path/image', options);

			expect(filename).toContain('.idunno');
		});

		test('falls back to the bundled template utils when no runtime helper is present', () => {
			const filename = getImageFilename('https://example.com/path/image.png', {
				title: 'Docs',
				imagePrefix: 'gallery/',
			});

			expect(filename).toBe('Docs/gallery/image.png');
		});

		test('supports injected sanitizers when callers want custom filename handling', () => {
			const filename = getImageFilename(
				'https://example.com/path/image',
				{
					title: 'Docs',
					imagePrefix: 'gallery/',
				},
				true,
				{
					generateValidFileName: (value) => String(value).replace(/image/g, 'asset'),
				},
			);

			expect(filename).toBe('Docs/gallery/asset.idunno');
		});
	});
});
