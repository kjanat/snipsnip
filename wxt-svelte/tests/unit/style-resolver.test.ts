import { applyStyleHints, resolveStylesOnLive, snapshotStyleHints } from '@/lib/style-resolver';
import { describe, expect, test } from 'bun:test';

function setBody(html: string): HTMLElement {
	document.body.innerHTML = html;
	return document.body;
}

function md(): Window {
	return globalThis.window;
}

describe('snapshotStyleHints', () => {
	test('detects italic via inline style', () => {
		const root = setBody('<span style="font-style: italic">word</span>');
		const hints = snapshotStyleHints(root, md());
		const span = hints[1];
		expect(span?.italic).toBe(true);
	});

	test('detects bold via numeric font-weight >= 600', () => {
		const root = setBody('<span style="font-weight: 700">word</span>');
		const hints = snapshotStyleHints(root, md());
		expect(hints[1]?.bold).toBe(true);
	});

	test('detects monospace family', () => {
		const root = setBody('<span style="font-family: Menlo, monospace">word</span>');
		const hints = snapshotStyleHints(root, md());
		expect(hints[1]?.mono).toBe(true);
	});

	test('detects line-through', () => {
		const root = setBody('<span style="text-decoration: line-through">word</span>');
		const hints = snapshotStyleHints(root, md());
		expect(hints[1]?.strike).toBe(true);
	});

	test('skips already-semantic tags', () => {
		const root = setBody('<em style="font-weight: 700">word</em>');
		const hints = snapshotStyleHints(root, md());
		expect(hints[1]?.bold).toBe(false);
	});
});

describe('applyStyleHints', () => {
	test('wraps italic span in <em>', () => {
		const live = setBody('<p><span style="font-style: italic">word</span></p>');
		const hints = snapshotStyleHints(live, md());
		// Clone into a fresh element for application
		const clone = live.cloneNode(true) as HTMLElement;
		applyStyleHints(clone, hints);
		expect(clone.innerHTML).toContain('<em>word</em>');
	});

	test('wraps bold span in <strong>', () => {
		const live = setBody('<p><span style="font-weight: 800">word</span></p>');
		const hints = snapshotStyleHints(live, md());
		const clone = live.cloneNode(true) as HTMLElement;
		applyStyleHints(clone, hints);
		expect(clone.innerHTML).toContain('<strong>word</strong>');
	});

	test('combines bold+italic into nested em>strong', () => {
		const live = setBody(
			'<p><span style="font-style: italic; font-weight: 700">word</span></p>',
		);
		const hints = snapshotStyleHints(live, md());
		const clone = live.cloneNode(true) as HTMLElement;
		applyStyleHints(clone, hints);
		expect(clone.innerHTML).toMatch(/<em><strong>word<\/strong><\/em>/);
	});

	test('does not double-wrap when parent already styles same way', () => {
		const live = setBody(
			'<div style="font-style: italic"><span style="font-style: italic">word</span></div>',
		);
		const hints = snapshotStyleHints(live, md());
		const clone = live.cloneNode(true) as HTMLElement;
		applyStyleHints(clone, hints);
		expect(clone.innerHTML.match(/<em>/g)?.length ?? 0).toBeLessThanOrEqual(1);
	});

	test('skips empty/whitespace-only spans', () => {
		const live = setBody('<p><span style="font-weight: 700">   </span></p>');
		const hints = snapshotStyleHints(live, md());
		const clone = live.cloneNode(true) as HTMLElement;
		applyStyleHints(clone, hints);
		expect(clone.innerHTML).not.toContain('<strong>');
	});

	test('skips headings (already styled bold by default)', () => {
		const live = setBody('<h1 style="font-weight: 900">Title</h1>');
		const hints = snapshotStyleHints(live, md());
		const clone = live.cloneNode(true) as HTMLElement;
		applyStyleHints(clone, hints);
		expect(clone.innerHTML).not.toContain('<strong>');
	});
});

describe('resolveStylesOnLive', () => {
	test('end-to-end: clone gains semantic tags from live computed styles', () => {
		const live = setBody(
			'<article><p>before <span style="font-style:italic;font-weight:700">word</span> after</p></article>',
		);
		const clone = live.cloneNode(true) as HTMLElement;
		resolveStylesOnLive(live, clone, md());
		expect(clone.innerHTML).toMatch(/<em><strong>word<\/strong><\/em>/);
		// live document untouched
		expect(live.innerHTML).not.toContain('<em>');
		expect(live.innerHTML).not.toContain('<strong>');
	});
});
