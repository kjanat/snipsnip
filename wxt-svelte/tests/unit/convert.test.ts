import { convertHtmlToMarkdown } from '@/lib/convert';
import { DEFAULT_SETTINGS } from '@/lib/defaults';
import { describe, expect, test } from 'bun:test';

describe('convertHtmlToMarkdown', () => {
	test('converts headings + paragraphs', () => {
		const md = convertHtmlToMarkdown('<h1>Title</h1><p>Body</p>', DEFAULT_SETTINGS);
		expect(md).toContain('# Title');
		expect(md).toContain('Body');
	});

	test('converts gfm tables', () => {
		const md = convertHtmlToMarkdown(
			'<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
			DEFAULT_SETTINGS,
		);
		expect(md).toContain('| A | B |');
		expect(md).toContain('| 1 | 2 |');
	});

	test('respects fenced code with backticks', () => {
		const md = convertHtmlToMarkdown(
			'<pre><code class="language-ts">const x = 1;</code></pre>',
			DEFAULT_SETTINGS,
		);
		expect(md).toContain('```');
		expect(md).toContain('const x = 1;');
	});

	test('strips images when imageStyle = noImage', () => {
		const md = convertHtmlToMarkdown(
			'<p>before<img src="x.png" alt="x">after</p>',
			{ ...DEFAULT_SETTINGS, imageStyle: 'noImage' },
		);
		expect(md).not.toContain('x.png');
		expect(md).toContain('before');
		expect(md).toContain('after');
	});

	test('emits obsidian embeds when imageStyle = obsidian', () => {
		const md = convertHtmlToMarkdown(
			'<img src="https://example.test/pic.jpg" alt="pic">',
			{ ...DEFAULT_SETTINGS, imageStyle: 'obsidian' },
		);
		expect(md).toContain('![[https://example.test/pic.jpg]]');
	});

	test('honours bullet marker setting', () => {
		const md = convertHtmlToMarkdown(
			'<ul><li>one</li><li>two</li></ul>',
			{ ...DEFAULT_SETTINGS, bulletListMarker: '*' },
		);
		expect(md).toMatch(/\*\s+one/);
		expect(md).toMatch(/\*\s+two/);
	});
});
