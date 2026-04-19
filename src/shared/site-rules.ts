import type { SiteRule, SiteRuleOverrides } from '../lib/types/index.ts';

export interface SiteRulePatternValidation {
	valid: boolean;
	error: string;
	normalizedPattern: string;
	scheme?: 'http' | 'https' | '*';
	host?: string;
	path?: string;
}

export interface ResolvedSiteRuleMatch {
	id: string;
	name: string;
	enabled: boolean;
	pattern: string;
}

export interface ResolvedSiteRuleOptions {
	options: Record<string, unknown>;
	matchedRule: ResolvedSiteRuleMatch | null;
	overriddenKeys: string[];
}

type BooleanOverrideKey = 'includeTemplate' | 'downloadImages';

type TextOverrideKey = 'frontmatter' | 'backmatter' | 'title' | 'imagePrefix' | 'mdClipsFolder';

type EnumOverrideKey = 'imageStyle' | 'imageRefStyle';

type TableFormattingKey = 'stripLinks' | 'stripFormatting' | 'prettyPrint' | 'centerText';

const BOOLEAN_OVERRIDE_KEYS: ReadonlyArray<BooleanOverrideKey> = ['includeTemplate', 'downloadImages'];

const TEXT_OVERRIDE_KEYS: ReadonlyArray<TextOverrideKey> = [
	'frontmatter',
	'backmatter',
	'title',
	'imagePrefix',
	'mdClipsFolder',
];

const ENUM_OVERRIDE_KEYS: ReadonlyArray<EnumOverrideKey> = ['imageStyle', 'imageRefStyle'];

const IMAGE_STYLE_VALUES: ReadonlySet<string> = new Set([
	'originalSource',
	'noImage',
	'markdown',
	'base64',
	'obsidian',
	'obsidian-nofolder',
]);

const IMAGE_REF_STYLE_VALUES: ReadonlySet<string> = new Set([
	'inlined',
	'referenced',
]);

const ENUM_OVERRIDE_VALUES = {
	imageStyle: IMAGE_STYLE_VALUES,
	imageRefStyle: IMAGE_REF_STYLE_VALUES,
};

const TABLE_FORMATTING_KEYS: ReadonlyArray<TableFormattingKey> = [
	'stripLinks',
	'stripFormatting',
	'prettyPrint',
	'centerText',
];

const DEFAULT_RULE_NAME_PREFIX = 'Site Rule';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

export function buildSiteRuleId(index = 0): string {
	return `site-rule-${index + 1}`;
}

function escapeRegex(value: unknown): string {
	return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wildcardToRegexFragment(value: string): string {
	return escapeRegex(value).replace(/\\\*/g, '.*');
}

function safeParseUrl(urlString: string): URL | null {
	try {
		return new URL(urlString);
	} catch {
		return null;
	}
}

export function validateSiteRulePattern(pattern: unknown): SiteRulePatternValidation {
	const rawPattern = String(pattern ?? '').trim();
	if (rawPattern === '') {
		return {
			valid: false,
			error: 'Pattern is required',
			normalizedPattern: '',
		};
	}

	const sanitizedPattern = rawPattern.replace(/[?#].*$/, '');
	let scheme: 'http' | 'https' | '*' = '*';
	let hostAndPath = sanitizedPattern;

	const schemeMatch = sanitizedPattern.match(/^([a-z*]+):\/\/(.+)$/i);
	if (schemeMatch) {
		const normalizedScheme = String(schemeMatch[1] ?? '').trim().toLowerCase();
		hostAndPath = String(schemeMatch[2] ?? '').trim();

		if (normalizedScheme !== 'http' && normalizedScheme !== 'https' && normalizedScheme !== '*') {
			return {
				valid: false,
				error: 'Only http://, https://, or no scheme are supported',
				normalizedPattern: rawPattern,
			};
		}

		scheme = normalizedScheme;
	} else if (sanitizedPattern.includes('://')) {
		return {
			valid: false,
			error: 'Pattern has an unsupported scheme',
			normalizedPattern: rawPattern,
		};
	}

	const slashIndex = hostAndPath.indexOf('/');
	let host = slashIndex >= 0 ? hostAndPath.slice(0, slashIndex) : hostAndPath;
	let path = slashIndex >= 0 ? hostAndPath.slice(slashIndex) : '/*';

	host = host.trim().toLowerCase();
	path = path.trim() || '/*';

	if (host === '') {
		return {
			valid: false,
			error: 'Pattern host is required',
			normalizedPattern: rawPattern,
		};
	}

	if (!path.startsWith('/')) {
		path = `/${path}`;
	}

	return {
		valid: true,
		error: '',
		scheme,
		host,
		path,
		normalizedPattern: `${scheme === '*' ? '' : `${scheme}://`}${host}${path}`,
	};
}

function isImageStyle(value: string): value is NonNullable<SiteRuleOverrides['imageStyle']> {
	return IMAGE_STYLE_VALUES.has(value);
}

function isImageRefStyle(value: string): value is NonNullable<SiteRuleOverrides['imageRefStyle']> {
	return IMAGE_REF_STYLE_VALUES.has(value);
}

export function normalizeSiteRuleOverrides(overrides: unknown = {}): SiteRuleOverrides {
	if (!isPlainObject(overrides)) {
		return {};
	}

	const normalized: SiteRuleOverrides = {};

	BOOLEAN_OVERRIDE_KEYS.forEach((key) => {
		if (Object.prototype.hasOwnProperty.call(overrides, key) && typeof overrides[key] === 'boolean') {
			normalized[key] = overrides[key];
		}
	});

	TEXT_OVERRIDE_KEYS.forEach((key) => {
		if (Object.prototype.hasOwnProperty.call(overrides, key) && overrides[key] != null) {
			normalized[key] = String(overrides[key]);
		}
	});

	if (Object.prototype.hasOwnProperty.call(overrides, 'imageStyle')) {
		const value = String(overrides.imageStyle ?? '').trim();
		if (isImageStyle(value)) {
			normalized.imageStyle = value;
		}
	}

	if (Object.prototype.hasOwnProperty.call(overrides, 'imageRefStyle')) {
		const value = String(overrides.imageRefStyle ?? '').trim();
		if (isImageRefStyle(value)) {
			normalized.imageRefStyle = value;
		}
	}

	const tableFormatting = overrides.tableFormatting;
	if (isPlainObject(tableFormatting)) {
		const normalizedTableFormatting: NonNullable<SiteRuleOverrides['tableFormatting']> = {};

		TABLE_FORMATTING_KEYS.forEach((key) => {
			if (Object.prototype.hasOwnProperty.call(tableFormatting, key) && typeof tableFormatting[key] === 'boolean') {
				normalizedTableFormatting[key] = tableFormatting[key];
			}
		});

		if (Object.keys(normalizedTableFormatting).length > 0) {
			normalized.tableFormatting = normalizedTableFormatting;
		}
	}

	return normalized;
}

export function normalizeSiteRule(rule: unknown, index = 0): SiteRule | null {
	if (!isPlainObject(rule)) {
		return null;
	}

	const pattern = String(rule.pattern ?? '').trim();
	if (pattern === '') {
		return null;
	}

	return {
		id: String(rule.id ?? '').trim() || buildSiteRuleId(index),
		name: String(rule.name ?? '').trim() || `${DEFAULT_RULE_NAME_PREFIX} ${index + 1}`,
		enabled: rule.enabled !== false,
		pattern,
		overrides: normalizeSiteRuleOverrides(rule.overrides),
	};
}

export function normalizeSiteRules(rules: unknown = []): SiteRule[] {
	if (!Array.isArray(rules)) {
		return [];
	}

	const seenIds = new Set<string>();
	const normalized: SiteRule[] = [];

	rules.forEach((rule, index) => {
		const nextRule = normalizeSiteRule(rule, index);
		if (nextRule === null) {
			return;
		}

		let nextId = nextRule.id;
		if (seenIds.has(nextId)) {
			nextId = `${nextId}-${index + 1}`;
		}

		seenIds.add(nextId);
		normalized.push({
			...nextRule,
			id: nextId,
		});
	});

	return normalized;
}

export function collectOverrideKeys(overrides: SiteRuleOverrides = {}): string[] {
	const keys: string[] = [];

	[...BOOLEAN_OVERRIDE_KEYS, ...TEXT_OVERRIDE_KEYS, ...ENUM_OVERRIDE_KEYS].forEach((key) => {
		if (Object.prototype.hasOwnProperty.call(overrides, key)) {
			keys.push(key);
		}
	});

	if (isPlainObject(overrides.tableFormatting)) {
		TABLE_FORMATTING_KEYS.forEach((key) => {
			if (Object.prototype.hasOwnProperty.call(overrides.tableFormatting, key)) {
				keys.push(`tableFormatting.${key}`);
			}
		});
	}

	return keys;
}

export function applySiteRuleOverrides(
	baseOptions: Record<string, unknown> = {},
	overrides: SiteRuleOverrides = {},
): Record<string, unknown> {
	const nextOptions = structuredClone(isPlainObject(baseOptions) ? baseOptions : {});

	delete nextOptions.siteRules;

	[...BOOLEAN_OVERRIDE_KEYS, ...TEXT_OVERRIDE_KEYS, ...ENUM_OVERRIDE_KEYS].forEach((key) => {
		if (Object.prototype.hasOwnProperty.call(overrides, key)) {
			nextOptions[key] = structuredClone(overrides[key]);
		}
	});

	if (isPlainObject(overrides.tableFormatting)) {
		const existingTableFormatting = isPlainObject(nextOptions.tableFormatting)
			? structuredClone(nextOptions.tableFormatting)
			: {};

		nextOptions.tableFormatting = {
			...existingTableFormatting,
			...structuredClone(overrides.tableFormatting),
		};
	}

	return nextOptions;
}

export function matchesSiteRulePattern(pattern: unknown, pageUrl: string): boolean {
	const validation = validateSiteRulePattern(pattern);
	if (!validation.valid || validation.host == null || validation.path == null || validation.scheme == null) {
		return false;
	}

	const parsedUrl = safeParseUrl(pageUrl);
	if (parsedUrl === null) {
		return false;
	}

	const scheme = parsedUrl.protocol.replace(/:$/, '').toLowerCase();
	if (scheme !== 'http' && scheme !== 'https') {
		return false;
	}

	if (validation.scheme !== '*' && validation.scheme !== scheme) {
		return false;
	}

	const hostRegex = new RegExp(`^${wildcardToRegexFragment(validation.host)}$`, 'i');
	const pathRegex = new RegExp(`^${wildcardToRegexFragment(validation.path)}$`);

	return hostRegex.test(parsedUrl.hostname) && pathRegex.test(parsedUrl.pathname || '/');
}

export function resolveSiteRuleOptions(
	pageUrl: string,
	baseOptions: Record<string, unknown> = {},
): ResolvedSiteRuleOptions {
	const safeBaseOptions = structuredClone(isPlainObject(baseOptions) ? baseOptions : {});
	const siteRules = normalizeSiteRules(safeBaseOptions.siteRules);
	delete safeBaseOptions.siteRules;

	const matchedRule = siteRules.find((rule) => rule.enabled && matchesSiteRulePattern(rule.pattern, pageUrl)) ?? null;
	if (matchedRule === null) {
		return {
			options: safeBaseOptions,
			matchedRule: null,
			overriddenKeys: [],
		};
	}

	return {
		options: applySiteRuleOverrides(safeBaseOptions, matchedRule.overrides),
		matchedRule: {
			id: matchedRule.id,
			name: matchedRule.name,
			enabled: matchedRule.enabled,
			pattern: matchedRule.pattern,
		},
		overriddenKeys: collectOverrideKeys(matchedRule.overrides),
	};
}

const siteRules = {
	BOOLEAN_OVERRIDE_KEYS,
	ENUM_OVERRIDE_VALUES,
	TABLE_FORMATTING_KEYS,
	TEXT_OVERRIDE_KEYS,
	applySiteRuleOverrides,
	buildSiteRuleId,
	collectOverrideKeys,
	matchesSiteRulePattern,
	normalizeSiteRule,
	normalizeSiteRuleOverrides,
	normalizeSiteRules,
	resolveSiteRuleOptions,
	validateSiteRulePattern,
};

export default siteRules;
