// GENERATED from site-rules.ts. Edit the TypeScript source only.
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

		// src/shared/site-rules.ts
		var exports_site_rules = {};
		__export(exports_site_rules, {
			validateSiteRulePattern: () => validateSiteRulePattern,
			resolveSiteRuleOptions: () => resolveSiteRuleOptions,
			normalizeSiteRules: () => normalizeSiteRules,
			normalizeSiteRuleOverrides: () => normalizeSiteRuleOverrides,
			normalizeSiteRule: () => normalizeSiteRule,
			matchesSiteRulePattern: () => matchesSiteRulePattern,
			default: () => site_rules_default,
			collectOverrideKeys: () => collectOverrideKeys,
			buildSiteRuleId: () => buildSiteRuleId,
			applySiteRuleOverrides: () => applySiteRuleOverrides,
		});
		module.exports = __toCommonJS(exports_site_rules);
		var BOOLEAN_OVERRIDE_KEYS = ['includeTemplate', 'downloadImages'];
		var TEXT_OVERRIDE_KEYS = [
			'frontmatter',
			'backmatter',
			'title',
			'imagePrefix',
			'mdClipsFolder',
		];
		var ENUM_OVERRIDE_KEYS = ['imageStyle', 'imageRefStyle'];
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
		var ENUM_OVERRIDE_VALUES = {
			imageStyle: IMAGE_STYLE_VALUES,
			imageRefStyle: IMAGE_REF_STYLE_VALUES,
		};
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
		function escapeRegex(value) {
			return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		}
		function wildcardToRegexFragment(value) {
			return escapeRegex(value).replace(/\\\*/g, '.*');
		}
		function safeParseUrl(urlString) {
			try {
				return new URL(urlString);
			} catch {
				return null;
			}
		}
		function validateSiteRulePattern(pattern) {
			const rawPattern = String(pattern ?? '').trim();
			if (rawPattern === '') {
				return {
					valid: false,
					error: 'Pattern is required',
					normalizedPattern: '',
				};
			}
			const sanitizedPattern = rawPattern.replace(/[?#].*$/, '');
			let scheme = '*';
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
		function collectOverrideKeys(overrides = {}) {
			const keys = [];
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
		function applySiteRuleOverrides(baseOptions = {}, overrides = {}) {
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
		function matchesSiteRulePattern(pattern, pageUrl) {
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
		function resolveSiteRuleOptions(pageUrl, baseOptions = {}) {
			const safeBaseOptions = structuredClone(isPlainObject(baseOptions) ? baseOptions : {});
			const siteRules = normalizeSiteRules(safeBaseOptions.siteRules);
			delete safeBaseOptions.siteRules;
			const matchedRule = siteRules.find((rule) => rule.enabled && matchesSiteRulePattern(rule.pattern, pageUrl))
				?? null;
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
		var siteRules = {
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
		var site_rules_default = siteRules;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipSiteRules = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
