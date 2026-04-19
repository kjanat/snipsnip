// GENERATED from options-state.ts. Edit the TypeScript source only.
(function(root) {
	const exported = (() => {
		const module = { exports: {} };
		var __defProp = Object.defineProperty;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		function __accessProp(key) {
			return this[key];
		}
		var __toCommonJS = (from) => {
			var entry = (__moduleCache ??= new WeakMap()).get(from), desc;
			if (entry) {
				return entry;
			}
			entry = __defProp({}, '__esModule', { value: true });
			if (from && typeof from === 'object' || typeof from === 'function') {
				for (var key of __getOwnPropNames(from)) {
					if (!__hasOwnProp.call(entry, key)) {
						__defProp(entry, key, {
							get: __accessProp.bind(from, key),
							enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
						});
					}
				}
			}
			__moduleCache.set(from, entry);
			return entry;
		};
		var __moduleCache;
		var __returnValue = (v) => v;
		function __exportSetter(name, newValue) {
			this[name] = __returnValue.bind(null, newValue);
		}
		var __export = (target, all) => {
			for (var name in all) {
				__defProp(target, name, {
					get: all[name],
					enumerable: true,
					configurable: true,
					set: __exportSetter.bind(all, name),
				});
			}
		};

		// src/shared/options-state.ts
		var exports_options_state = {};
		__export(exports_options_state, {
			validateSendToUrlTemplate: () => validateSendToUrlTemplate,
			resetOptionKeys: () => resetOptionKeys,
			resetAllOptions: () => resetAllOptions,
			normalizeSendToMaxUrlLength: () => normalizeSendToMaxUrlLength,
			normalizeImportedOptions: () => normalizeImportedOptions,
			normalizeDefaultSendToTarget: () => normalizeDefaultSendToTarget,
			normalizeCustomSendToTargets: () => normalizeCustomSendToTargets,
			getContextMenuTransition: () => getContextMenuTransition,
			default: () => options_state_default,
			buildExportFilename: () => buildExportFilename,
		});
		module.exports = __toCommonJS(exports_options_state);

		// src/shared/site-rules.ts
		var BOOLEAN_OVERRIDE_KEYS = ['includeTemplate', 'downloadImages'];
		var TEXT_OVERRIDE_KEYS = [
			'frontmatter',
			'backmatter',
			'title',
			'imagePrefix',
			'mdClipsFolder',
		];
		var IMAGE_STYLE_VALUES = new Set([
			'originalSource',
			'noImage',
			'markdown',
			'base64',
			'obsidian',
			'obsidian-nofolder',
		]);
		var IMAGE_REF_STYLE_VALUES = new Set([
			'inlined',
			'referenced',
		]);
		var TABLE_FORMATTING_KEYS = [
			'stripLinks',
			'stripFormatting',
			'prettyPrint',
			'centerText',
		];
		var DEFAULT_RULE_NAME_PREFIX = 'Site Rule';
		function isPlainObject(value) {
			return Object.prototype.toString.call(value) === '[object Object]';
		}
		function buildSiteRuleId(index = 0) {
			return `site-rule-${index + 1}`;
		}
		function isImageStyle(value) {
			return IMAGE_STYLE_VALUES.has(value);
		}
		function isImageRefStyle(value) {
			return IMAGE_REF_STYLE_VALUES.has(value);
		}
		function normalizeSiteRuleOverrides(overrides = {}) {
			if (!isPlainObject(overrides)) {
				return {};
			}
			const normalized = {};
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
				const normalizedTableFormatting = {};
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
		function normalizeSiteRule(rule, index = 0) {
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
		function normalizeSiteRules(rules = []) {
			if (!Array.isArray(rules)) {
				return [];
			}
			const seenIds = new Set();
			const normalized = [];
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

		// src/shared/options-state.ts
		function isPlainObject2(value) {
			return Object.prototype.toString.call(value) === '[object Object]';
		}
		function deepClone(value) {
			if (typeof value === 'undefined') {
				return value;
			}
			return structuredClone(value);
		}
		var POPUP_PRIMARY_ACTIONS = new Set(['markdown', 'text', 'html', 'pdf', 'copy', 'sendTo']);
		var BUILTIN_SEND_TO_TARGETS = new Set(['chatgpt', 'claude', 'perplexity']);
		var DEFAULT_SEND_TO_TARGET = 'chatgpt';
		var DEFAULT_SEND_TO_MAX_URL_LENGTH = 3600;
		function countPromptPlaceholders(value) {
			const matches = value.match(/\{prompt\}/g);
			return matches === null ? 0 : matches.length;
		}
		function validateSendToUrlTemplate(value = '') {
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
		function normalizeCustomSendToTarget(target, index) {
			if (!isPlainObject2(target)) {
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
		function normalizeCustomSendToTargets(targets = []) {
			if (!Array.isArray(targets)) {
				return [];
			}
			const seenIds = new Set();
			const normalizedTargets = [];
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
		function normalizePopupPrimaryAction(value, fallbackValue = 'markdown') {
			const normalizedValue = String(value ?? '').trim();
			return POPUP_PRIMARY_ACTIONS.has(normalizedValue) ? normalizedValue : fallbackValue;
		}
		function normalizeDefaultSendToTarget(targetValue, customTargets = [], fallbackValue = DEFAULT_SEND_TO_TARGET) {
			const normalizedTargetValue = String(targetValue ?? '').trim();
			if (BUILTIN_SEND_TO_TARGETS.has(normalizedTargetValue)) {
				return normalizedTargetValue;
			}
			return customTargets.some((target) => target.id === normalizedTargetValue)
				? normalizedTargetValue
				: fallbackValue;
		}
		function normalizeSendToMaxUrlLength(value, fallbackValue = DEFAULT_SEND_TO_MAX_URL_LENGTH) {
			const normalizedFallback = Number.isFinite(Number(fallbackValue)) && Number(fallbackValue) > 0
				? Math.floor(Number(fallbackValue))
				: DEFAULT_SEND_TO_MAX_URL_LENGTH;
			const parsedValue = Number.parseInt(String(value ?? '').trim(), 10);
			return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : normalizedFallback;
		}
		function getContextMenuTransition(previousOptions = {}, nextOptions = {}) {
			const previousEnabled = Boolean(previousOptions.contextMenus);
			const nextEnabled = Boolean(nextOptions.contextMenus);
			if (previousEnabled === nextEnabled) {
				return 'none';
			}
			return nextEnabled ? 'create' : 'remove';
		}
		function normalizeImportedOptions(importedOptions = {}, defaultOptions = {}, deps = {}) {
			const safeImported = isPlainObject2(importedOptions) ? importedOptions : {};
			const safeDefaults = isPlainObject2(defaultOptions) ? defaultOptions : {};
			const normalized = {
				...deepClone(safeDefaults),
				...deepClone(safeImported),
			};
			const defaultTableFormatting = isPlainObject2(safeDefaults.tableFormatting)
				? deepClone(safeDefaults.tableFormatting)
				: {};
			const importedTableFormatting = isPlainObject2(safeImported.tableFormatting)
				? deepClone(safeImported.tableFormatting)
				: {};
			normalized.tableFormatting = {
				...defaultTableFormatting,
				...importedTableFormatting,
			};
			const normalizeSiteRules2 = deps.normalizeSiteRules ?? normalizeSiteRules;
			normalized.siteRules = normalizeSiteRules2(normalized.siteRules);
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
		function buildExportFilename(date = new Date(), prefix = 'SnipSnip-export') {
			const safeDate = date instanceof Date ? date : new Date(date);
			const timestamp = Number.isNaN(safeDate.getTime()) ? new Date() : safeDate;
			const year = timestamp.getFullYear();
			const month = String(timestamp.getMonth() + 1).padStart(2, '0');
			const day = String(timestamp.getDate()).padStart(2, '0');
			return `${prefix}-${year}-${month}-${day}.json`;
		}
		function resetOptionKeys(currentOptions = {}, defaultOptions = {}, keys = [], deps = {}) {
			const safeDefaults = isPlainObject2(defaultOptions) ? defaultOptions : {};
			const normalizedCurrent = normalizeImportedOptions(currentOptions, safeDefaults, deps);
			const nextOptions = deepClone(normalizedCurrent);
			const keyList = Array.isArray(keys) ? keys : String(keys ?? '').split(',');
			keyList.forEach((rawKey) => {
				const key = String(rawKey ?? '').trim();
				if (key === '') {
					return;
				}
				if (key === 'tableFormatting') {
					nextOptions.tableFormatting = isPlainObject2(safeDefaults.tableFormatting)
						? deepClone(safeDefaults.tableFormatting)
						: {};
					return;
				}
				if (key.startsWith('tableFormatting.')) {
					const tableOption = key.split('.')[1];
					if (tableOption == null || tableOption === '') {
						return;
					}
					const defaultTableFormatting = isPlainObject2(safeDefaults.tableFormatting)
						? safeDefaults.tableFormatting
						: {};
					const nextTableFormatting = isPlainObject2(nextOptions.tableFormatting) ? nextOptions.tableFormatting : {};
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
		function resetAllOptions(currentOptions = {}, defaultOptions = {}, deps = {}) {
			const safeDefaults = isPlainObject2(defaultOptions) ? defaultOptions : {};
			const normalizedCurrent = normalizeImportedOptions(currentOptions, safeDefaults, deps);
			const normalizedDefaults = normalizeImportedOptions({}, safeDefaults, deps);
			return {
				options: normalizedDefaults,
				contextMenuAction: getContextMenuTransition(normalizedCurrent, normalizedDefaults),
			};
		}
		var optionsState = {
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
		var options_state_default = optionsState;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipOptionsState = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
