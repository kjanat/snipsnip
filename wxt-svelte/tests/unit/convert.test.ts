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

	test('falls back to raw HTML when a cell contains a list', () => {
		const md = convertHtmlToMarkdown(
			'<table><tr><th>A</th></tr><tr><td><ul><li>x</li></ul></td></tr></table>',
			DEFAULT_SETTINGS,
		);
		expect(md).toContain('<table>');
		expect(md).toContain('<ul>');
		expect(md).not.toMatch(/^\| A \|/m);
	});

	test('falls back to raw HTML when a cell contains a nested table', () => {
		const md = convertHtmlToMarkdown(
			'<table><tr><th>A</th></tr><tr><td><table><tr><td>inner</td></tr></table></td></tr></table>',
			DEFAULT_SETTINGS,
		);
		expect(md).toContain('<table>');
		expect(md.match(/<table>/g)?.length).toBe(2);
	});

	test('falls back to raw HTML for blockquote, code block, colspan', () => {
		expect(
			convertHtmlToMarkdown(
				'<table><thead><tr><th>A</th></tr></thead><tbody><tr><td><blockquote>q</blockquote></td></tr></tbody></table>',
				DEFAULT_SETTINGS,
			),
		).toContain('<table>');
		expect(
			convertHtmlToMarkdown(
				'<table><thead><tr><th>A</th></tr></thead><tbody><tr><td><pre><code>x</code></pre></td></tr></tbody></table>',
				DEFAULT_SETTINGS,
			),
		).toContain('<table>');
		expect(
			convertHtmlToMarkdown(
				'<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td colspan="2">spanning</td></tr></tbody></table>',
				DEFAULT_SETTINGS,
			),
		).toContain('<table>');
	});

	test('keeps <br> in cell as literal <br> inside GFM table', () => {
		const md = convertHtmlToMarkdown(
			'<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>line one<br>line two</td></tr></tbody></table>',
			DEFAULT_SETTINGS,
		);
		expect(md).toMatch(/^\| A \|/m);
		expect(md).toContain('<br>');
		expect(md).not.toContain('<table>');
	});

	test('falls back to HTML when table has no header row', () => {
		const md = convertHtmlToMarkdown(
			'<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></tbody></table>',
			DEFAULT_SETTINGS,
		);
		expect(md).toContain('<table>');
		expect(md).not.toMatch(/^\| a \| b \|/m);
	});

	test('keeps GFM table when all cells are inline-only', () => {
		const md = convertHtmlToMarkdown(
			'<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>plain <strong>1</strong></td><td><a href="https://x">2</a></td></tr></tbody></table>',
			DEFAULT_SETTINGS,
		);
		expect(md).toMatch(/^\| A \| B \|/m);
		expect(md).not.toContain('<table>');
	});

	test('htmlTableFallback=always forces HTML even for trivial tables', () => {
		const md = convertHtmlToMarkdown(
			'<table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>',
			{ ...DEFAULT_SETTINGS, htmlTableFallback: 'always' },
		);
		expect(md).toContain('<table>');
		expect(md).not.toMatch(/^\| A \|/m);
	});

	test('GitHub/JSR pre-with-spans (no <code>) becomes fenced block with sniffed language', () => {
		const md = convertHtmlToMarkdown(
			'<div class="highlight highlight-source-ts notranslate"><pre><span class="token comment">/** doc */</span>\n<span class="token keyword">const</span> x = <span class="token number">1</span>;</pre></div>',
			DEFAULT_SETTINGS,
		);
		expect(md).toContain('```ts');
		expect(md).toContain('const x = 1;');
		expect(md).toContain('/** doc */');
		expect(md).toMatch(/```ts\n[\s\S]+\n```/);
	});

	test('pre-without-code with no language class still emits a fence', () => {
		const md = convertHtmlToMarkdown(
			'<pre><span>a</span>\n<span>b</span></pre>',
			DEFAULT_SETTINGS,
		);
		expect(md).toMatch(/```\na\nb\n```/);
	});

	test('pre-without-code respects indented codeBlockStyle', () => {
		const md = convertHtmlToMarkdown(
			'<pre>line1\nline2</pre>',
			{ ...DEFAULT_SETTINGS, codeBlockStyle: 'indented' },
		);
		expect(md).toContain('    line1');
		expect(md).toContain('    line2');
		expect(md).not.toContain('```');
	});

	test('language-X class on the pre itself is sniffed', () => {
		const md = convertHtmlToMarkdown(
			'<pre class="language-rust"><span>fn main() {}</span></pre>',
			DEFAULT_SETTINGS,
		);
		expect(md).toContain('```rust');
	});

	test('htmlTableFallback=never bypasses our rule, gfm gets first crack', () => {
		// gfm will produce broken-but-attempted GFM for block-cell tables instead
		// of triggering our HTML fallback.
		const md = convertHtmlToMarkdown(
			'<table><thead><tr><th>A</th></tr></thead><tbody><tr><td><ul><li>x</li></ul></td></tr></tbody></table>',
			{ ...DEFAULT_SETTINGS, htmlTableFallback: 'never' },
		);
		expect(md).toMatch(/^\| A \|/m);
		expect(md).toMatch(/\|\s+---\s+\|/);
	});
});
