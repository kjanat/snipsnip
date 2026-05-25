import { applyRule, findMatchingRule } from '@/lib/site-rules';
import type { SiteRule } from '@/lib/types';
import { describe, expect, test } from 'bun:test';

function rule(partial: Partial<SiteRule>): SiteRule {
	return { pattern: '', contentSelector: '', excludeSelectors: '', ...partial };
}

describe('findMatchingRule', () => {
	test('exact hostname match', () => {
		const rules = [rule({ pattern: 'example.com' })];
		expect(findMatchingRule(rules, 'example.com')?.pattern).toBe('example.com');
	});

	test('wildcard subdomain', () => {
		const rules = [rule({ pattern: '*.example.com' })];
		expect(findMatchingRule(rules, 'docs.example.com')?.pattern).toBe('*.example.com');
		expect(findMatchingRule(rules, 'example.com')).toBeNull();
	});

	test('skips empty patterns', () => {
		const rules = [rule({ pattern: '' }), rule({ pattern: 'example.com' })];
		expect(findMatchingRule(rules, 'example.com')?.pattern).toBe('example.com');
	});

	test('returns null when nothing matches', () => {
		expect(findMatchingRule([rule({ pattern: 'a.test' })], 'b.test')).toBeNull();
	});
});

describe('applyRule', () => {
	function buildDoc(html: string): Document {
		return new DOMParser().parseFromString(`<!doctype html><html><body>${html}</body></html>`, 'text/html');
	}

	test('removes excluded selectors', () => {
		const doc = buildDoc('<article>keep</article><div class="ad">drop</div>');
		applyRule(doc, rule({ excludeSelectors: '.ad' }));
		expect(doc.body.innerHTML).toContain('keep');
		expect(doc.body.innerHTML).not.toContain('drop');
	});

	test('replaces body with content selector match', () => {
		const doc = buildDoc('<header>nav</header><article>core</article><footer>foot</footer>');
		applyRule(doc, rule({ contentSelector: 'article' }));
		expect(doc.body.innerHTML).toContain('core');
		expect(doc.body.innerHTML).not.toContain('nav');
		expect(doc.body.innerHTML).not.toContain('foot');
	});

	test('exclude runs before content selector', () => {
		const doc = buildDoc('<article>main<div class="ad">noise</div></article>');
		applyRule(doc, rule({ contentSelector: 'article', excludeSelectors: '.ad' }));
		expect(doc.body.innerHTML).toContain('main');
		expect(doc.body.innerHTML).not.toContain('noise');
	});
});
