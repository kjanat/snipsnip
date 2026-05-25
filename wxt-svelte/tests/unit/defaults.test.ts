import { DEFAULT_SETTINGS, parseSettings, safeParseSettings } from '@/lib/defaults';
import { describe, expect, test } from 'bun:test';

describe('DEFAULT_SETTINGS', () => {
	test('matches schema after round-trip', () => {
		expect(parseSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
	});

	test('all required fields present', () => {
		const required = [
			'headingStyle',
			'bulletListMarker',
			'codeBlockStyle',
			'frontmatter',
			'historyLimit',
			'siteRules',
			'agentBridgeHost',
		] as const;
		for (const key of required) {
			expect(DEFAULT_SETTINGS).toHaveProperty(key);
		}
	});
});

describe('parseSettings', () => {
	test('fills missing fields with defaults', () => {
		const out = parseSettings({ headingStyle: 'setext' });
		expect(out.headingStyle).toBe('setext');
		expect(out.bulletListMarker).toBe(DEFAULT_SETTINGS.bulletListMarker);
		expect(out.historyLimit).toBe(DEFAULT_SETTINGS.historyLimit);
	});

	test('rejects invalid enum value', () => {
		expect(() => parseSettings({ headingStyle: 'banana' })).toThrow();
	});

	test('rejects non-integer historyLimit', () => {
		expect(() => parseSettings({ historyLimit: 1.5 })).toThrow();
	});

	test('rejects historyLimit < 1', () => {
		expect(() => parseSettings({ historyLimit: 0 })).toThrow();
	});

	test('accepts valid site rules array', () => {
		const out = parseSettings({
			siteRules: [{ pattern: '*.test', contentSelector: 'main', excludeSelectors: '' }],
		});
		expect(out.siteRules).toHaveLength(1);
		expect(out.siteRules[0]?.pattern).toBe('*.test');
	});
});

describe('safeParseSettings', () => {
	test('returns defaults when input invalid', () => {
		expect(safeParseSettings({ headingStyle: 'invalid' })).toEqual(DEFAULT_SETTINGS);
		expect(safeParseSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(safeParseSettings('garbage')).toEqual(DEFAULT_SETTINGS);
	});

	test('returns parsed value when valid', () => {
		const out = safeParseSettings({ saveAs: true });
		expect(out.saveAs).toBe(true);
	});
});
