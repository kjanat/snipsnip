import type { SiteRule } from './types';

function patternToRegex(pattern: string): RegExp {
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
	return new RegExp(`^${escaped}$`, 'i');
}

export function findMatchingRule(rules: SiteRule[], hostname: string): SiteRule | null {
	for (const rule of rules) {
		if (!rule.pattern) continue;
		const regex = patternToRegex(rule.pattern);
		if (regex.test(hostname)) return rule;
	}
	return null;
}

export function applyRule(doc: Document, rule: SiteRule): Document {
	if (rule.excludeSelectors.trim().length > 0) {
		for (const selector of rule.excludeSelectors.split(',').map((s) => s.trim()).filter(Boolean)) {
			for (const node of Array.from(doc.querySelectorAll(selector))) {
				node.remove();
			}
		}
	}

	if (rule.contentSelector.trim().length > 0) {
		const root = doc.querySelector(rule.contentSelector);
		if (root) {
			const body = doc.body;
			body.innerHTML = '';
			body.appendChild(root.cloneNode(true));
		}
	}

	return doc;
}
