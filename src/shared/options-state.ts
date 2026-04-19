import { normalizeSiteRules as defaultNormalizeSiteRules } from './site-rules.ts';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function deepClone<T>(value: T): T {
	if (typeof value === 'undefined') {
		return value;
	}

	return structuredClone(value);
}

const POPUP_PRIMARY_ACTIONS = new Set(['markdown', 'text', 'html', 'pdf', 'copy', 'sendTo']);
const BUILTIN_SEND_TO_TARGETS = new Set(['chatgpt', 'claude', 'perplexity']);
const DEFAULT_SEND_TO_TARGET = 'chatgpt';
const DEFAULT_SEND_TO_MAX_URL_LENGTH = 3600;

function countPromptPlaceholders(value: string): number {
	const matches = value.match(/\{prompt\}/g);
	return matches === null ? 0 : matches.length;
}

export function validateSendToUrlTemplate(value = ''): {
	valid: boolean;
	normalizedValue: string;
	error: string;
} {
	const normalizedValue = value.trim();
	if (normalizedValue === '') {
		return { valid: false, normalizedValue: '', error: 'URL template is required' };
	}

	if (countPromptPlaceholders(normalizedValue) !== 1) {
		return { valid: false, normalizedValue, error: 'URL template must contain exactly one {prompt} placeholder' };
	}

	const queryStartIndex = normalizedValue.indexOf('?');
	const hashStartIndex = normalizedValue.indexOf('#');
	const promptIndex = normalizedValue.indexOf('{prompt}');
	const queryEndIndex = hashStartIndex === -1 ? normalizedValue.length : hashStartIndex;

	if (queryStartIndex === -1 || promptIndex < queryStartIndex || promptIndex >= queryEndIndex) {
		return { valid: false, normalizedValue, error: '{prompt} must appear in the query portion of the URL' };
	}

	try {
		const parsedUrl = new URL(normalizedValue.replace('{prompt}', '__SNIPSNIP_PROMPT__'));
		if (parsedUrl.protocol !== 'https:') {
			return { valid: false, normalizedValue, error: 'URL template must start with https://' };
		}
	} catch {
		return { valid: false, normalizedValue, error: 'URL template must be a valid HTTPS URL' };
	}

	return { valid: true, normalizedValue, error: '' };
}

function normalizeCustomSendToTarget(target: unknown, index: number) {
	if (!isPlainObject(target)) {
		return null;
	}

	const name = String(target.name ?? '').trim();
	const urlTemplateValue = typeof target.urlTemplate === 'string' ? target.urlTemplate : String(target.url ?? '');
	const validation = validateSendToUrlTemplate(urlTemplateValue);
	if (name === '' || !validation.valid) {
		return null;
	}

	const rawId = String(target.id ?? '').trim();
	return {
		id: rawId || `custom-target-${index + 1}`,
		name,
		urlTemplate: validation.normalizedValue,
	};
}

export function normalizeCustomSendToTargets(
	targets: unknown = [],
): Array<{ id: string; name: string; urlTemplate: string }> {
	if (!Array.isArray(targets)) {
		return [];
	}

	const seenIds = new Set<string>();
	const normalizedTargets: Array<{ id: string; name: string; urlTemplate: string }> = [];

	targets.forEach((target, index) => {
		const normalizedTarget = normalizeCustomSendToTarget(target, index);
		if (normalizedTarget === null || seenIds.has(normalizedTarget.id)) {
			return;
		}

		seenIds.add(normalizedTarget.id);
		normalizedTargets.push(normalizedTarget);
	});

	return normalizedTargets;
}

function normalizePopupPrimaryAction(value: unknown, fallbackValue = 'markdown'): string {
	const normalizedValue = String(value ?? '').trim();
	return POPUP_PRIMARY_ACTIONS.has(normalizedValue) ? normalizedValue : fallbackValue;
}

export function normalizeDefaultSendToTarget(
	targetValue: unknown,
	customTargets: Array<{ id: string }> = [],
	fallbackValue = DEFAULT_SEND_TO_TARGET,
): string {
	const normalizedTargetValue = String(targetValue ?? '').trim();
	if (BUILTIN_SEND_TO_TARGETS.has(normalizedTargetValue)) {
		return normalizedTargetValue;
	}

	return customTargets.some((target) => target.id === normalizedTargetValue)
		? normalizedTargetValue
		: fallbackValue;
}

export function normalizeSendToMaxUrlLength(
	value: unknown,
	fallbackValue: unknown = DEFAULT_SEND_TO_MAX_URL_LENGTH,
): number {
	const normalizedFallback = Number.isFinite(Number(fallbackValue)) && Number(fallbackValue) > 0
		? Math.floor(Number(fallbackValue))
		: DEFAULT_SEND_TO_MAX_URL_LENGTH;
	const parsedValue = Number.parseInt(String(value ?? '').trim(), 10);
	return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : normalizedFallback;
}

export function getContextMenuTransition(
	previousOptions: Record<string, unknown> = {},
	nextOptions: Record<string, unknown> = {},
): 'none' | 'create' | 'remove' {
	const previousEnabled = Boolean(previousOptions.contextMenus);
	const nextEnabled = Boolean(nextOptions.contextMenus);

	if (previousEnabled === nextEnabled) {
		return 'none';
	}

	return nextEnabled ? 'create' : 'remove';
}

export function normalizeImportedOptions(
	importedOptions: Record<string, unknown> = {},
	defaultOptions: Record<string, unknown> = {},
	deps: {
		normalizeSiteRules?: (rules?: unknown) => unknown[];
	} = {},
): Record<string, unknown> {
	const safeImported = isPlainObject(importedOptions) ? importedOptions : {};
	const safeDefaults = isPlainObject(defaultOptions) ? defaultOptions : {};
	const normalized = {
		...deepClone(safeDefaults),
		...deepClone(safeImported),
	};

	const defaultTableFormatting = isPlainObject(safeDefaults.tableFormatting)
		? deepClone(safeDefaults.tableFormatting)
		: {};
	const importedTableFormatting = isPlainObject(safeImported.tableFormatting)
		? deepClone(safeImported.tableFormatting)
		: {};

	normalized.tableFormatting = {
		...defaultTableFormatting,
		...importedTableFormatting,
	};

	const normalizeSiteRules = deps.normalizeSiteRules ?? defaultNormalizeSiteRules;
	normalized.siteRules = normalizeSiteRules(normalized.siteRules);
	const normalizedCustomTargets = normalizeCustomSendToTargets(normalized.sendToCustomTargets);
	normalized.defaultExportType = normalizePopupPrimaryAction(
		normalized.defaultExportType,
		normalizePopupPrimaryAction(safeDefaults.defaultExportType, 'markdown'),
	);
	normalized.sendToCustomTargets = normalizedCustomTargets;
	normalized.defaultSendToTarget = normalizeDefaultSendToTarget(
		normalized.defaultSendToTarget,
		normalizedCustomTargets,
		normalizeDefaultSendToTarget(
			safeDefaults.defaultSendToTarget,
			normalizeCustomSendToTargets(safeDefaults.sendToCustomTargets),
		),
	);
	normalized.sendToMaxUrlLength = normalizeSendToMaxUrlLength(
		normalized.sendToMaxUrlLength,
		normalizeSendToMaxUrlLength(safeDefaults.sendToMaxUrlLength),
	);

	return normalized;
}

export function buildExportFilename(date: Date | string = new Date(), prefix = 'SnipSnip-export'): string {
	const safeDate = date instanceof Date ? date : new Date(date);
	const timestamp = Number.isNaN(safeDate.getTime()) ? new Date() : safeDate;
	const year = timestamp.getFullYear();
	const month = String(timestamp.getMonth() + 1).padStart(2, '0');
	const day = String(timestamp.getDate()).padStart(2, '0');
	return `${prefix}-${year}-${month}-${day}.json`;
}

export function resetOptionKeys(
	currentOptions: Record<string, unknown> = {},
	defaultOptions: Record<string, unknown> = {},
	keys: string[] | string = [],
	deps: {
		normalizeSiteRules?: (rules?: unknown) => unknown[];
	} = {},
): {
	options: Record<string, unknown>;
	contextMenuAction: 'none' | 'create' | 'remove';
} {
	const safeDefaults = isPlainObject(defaultOptions) ? defaultOptions : {};
	const normalizedCurrent = normalizeImportedOptions(currentOptions, safeDefaults, deps);
	const nextOptions = deepClone(normalizedCurrent);
	const keyList = Array.isArray(keys) ? keys : String(keys ?? '').split(',');

	keyList.forEach((rawKey) => {
		const key = String(rawKey ?? '').trim();
		if (key === '') {
			return;
		}

		if (key === 'tableFormatting') {
			nextOptions.tableFormatting = isPlainObject(safeDefaults.tableFormatting)
				? deepClone(safeDefaults.tableFormatting)
				: {};
			return;
		}

		if (key.startsWith('tableFormatting.')) {
			const tableOption = key.split('.')[1];
			if (tableOption == null || tableOption === '') {
				return;
			}

			const defaultTableFormatting = isPlainObject(safeDefaults.tableFormatting) ? safeDefaults.tableFormatting : {};
			const nextTableFormatting = isPlainObject(nextOptions.tableFormatting) ? nextOptions.tableFormatting : {};
			nextOptions.tableFormatting = nextTableFormatting;

			if (Object.prototype.hasOwnProperty.call(defaultTableFormatting, tableOption)) {
				nextTableFormatting[tableOption] = deepClone(defaultTableFormatting[tableOption]);
			} else {
				delete nextTableFormatting[tableOption];
			}
			return;
		}

		nextOptions[key] = deepClone(safeDefaults[key]);
	});

	const normalizedNext = normalizeImportedOptions(nextOptions, safeDefaults, deps);
	return {
		options: normalizedNext,
		contextMenuAction: getContextMenuTransition(normalizedCurrent, normalizedNext),
	};
}

export function resetAllOptions(
	currentOptions: Record<string, unknown> = {},
	defaultOptions: Record<string, unknown> = {},
	deps: {
		normalizeSiteRules?: (rules?: unknown) => unknown[];
	} = {},
): {
	options: Record<string, unknown>;
	contextMenuAction: 'none' | 'create' | 'remove';
} {
	const safeDefaults = isPlainObject(defaultOptions) ? defaultOptions : {};
	const normalizedCurrent = normalizeImportedOptions(currentOptions, safeDefaults, deps);
	const normalizedDefaults = normalizeImportedOptions({}, safeDefaults, deps);

	return {
		options: normalizedDefaults,
		contextMenuAction: getContextMenuTransition(normalizedCurrent, normalizedDefaults),
	};
}

const optionsState = {
	buildExportFilename,
	normalizeImportedOptions,
	getContextMenuTransition,
	resetOptionKeys,
	resetAllOptions,
	validateSendToUrlTemplate,
	normalizeCustomSendToTargets,
	normalizeDefaultSendToTarget,
	normalizeSendToMaxUrlLength,
};

export default optionsState;
