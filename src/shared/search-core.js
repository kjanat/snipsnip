// GENERATED from search-core.ts. Edit the TypeScript source only.
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

		// src/shared/search-core.ts
		var exports_search_core = {};
		__export(exports_search_core, {
			toWords: () => toWords,
			toCondensed: () => toCondensed,
			scoreSecondaryField: () => scoreSecondaryField,
			scorePrimaryField: () => scorePrimaryField,
			scoreField: () => scoreField,
			runSearch: () => runSearch,
			normalizeSearchText: () => normalizeSearchText,
			isSingleEditMatch: () => isSingleEditMatch,
			getSubsequenceSpan: () => getSubsequenceSpan,
			evaluateEntry: () => evaluateEntry,
			default: () => search_core_default,
			createField: () => createField,
			buildAcronym: () => buildAcronym,
			STRICT_THRESHOLDS: () => STRICT_THRESHOLDS,
			SCORES: () => SCORES,
			FALLBACK_THRESHOLDS: () => FALLBACK_THRESHOLDS,
		});
		module.exports = __toCommonJS(exports_search_core);
		var SCORES = {
			PRIMARY_EXACT: 100,
			EXACT_ALIAS: 90,
			PRIMARY_SUBSTRING: 80,
			ACRONYM: 70,
			SUBSEQUENCE: 65,
			TYPO: 60,
			SECONDARY_EXACT: 45,
			SECONDARY_SUBSTRING: 25,
		};
		var STRICT_THRESHOLDS = { minTokenScore: 60, minAverageScore: 70 };
		var FALLBACK_THRESHOLDS = { minTokenScore: 60, minAverageScore: 65 };
		function normalizeSearchText(value) {
			return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(
				/([a-z0-9])([A-Z])/g,
				'$1 $2',
			).replace(/[_./-]+/g, ' ').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
		}
		function toWords(value) {
			const normalized = normalizeSearchText(value);
			return normalized === '' ? [] : normalized.split(' ');
		}
		function toCondensed(value) {
			return toWords(value).join('');
		}
		function buildAcronym(words) {
			if (words.length === 0) {
				return '';
			}
			return words.map((word) => word[0] ?? '').join('');
		}
		function createField(rawText, options) {
			const normalized = normalizeSearchText(rawText);
			if (normalized === '') {
				return null;
			}
			const words = normalized.split(' ');
			const condensed = words.join('');
			const isShort = words.length <= 4 || condensed.length <= 24;
			return {
				rawText: String(rawText ?? ''),
				normalized,
				words,
				condensed,
				acronym: buildAcronym(words),
				source: options.source,
				qualifies: options.qualifies !== false,
				primary: options.primary !== false,
				isAlias: Boolean(options.isAlias),
				allowFuzzy: options.allowFuzzy ?? isShort,
			};
		}
		function isPrimaryWordStart(field, token) {
			return field.words.some((word) => word === token || word.startsWith(token));
		}
		function getSubsequenceSpan(query, target) {
			let start = -1;
			let end = -1;
			let queryIndex = 0;
			for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
				if (target[targetIndex] !== query[queryIndex]) {
					continue;
				}
				if (start === -1) {
					start = targetIndex;
				}
				end = targetIndex;
				queryIndex += 1;
				if (queryIndex === query.length) {
					return end - start + 1;
				}
			}
			return 0;
		}
		function isSingleEditMatch(query, candidate) {
			const queryLength = query.length;
			const candidateLength = candidate.length;
			if (Math.abs(queryLength - candidateLength) > 1 || query === candidate) {
				return false;
			}
			let queryIndex = 0;
			let candidateIndex = 0;
			let mismatches = 0;
			while (queryIndex < queryLength && candidateIndex < candidateLength) {
				if (query[queryIndex] === candidate[candidateIndex]) {
					queryIndex += 1;
					candidateIndex += 1;
					continue;
				}
				mismatches += 1;
				if (mismatches > 1) {
					return false;
				}
				if (queryLength > candidateLength) {
					queryIndex += 1;
				} else if (candidateLength > queryLength) {
					candidateIndex += 1;
				} else {
					queryIndex += 1;
					candidateIndex += 1;
				}
			}
			if (queryIndex < queryLength || candidateIndex < candidateLength) {
				mismatches += 1;
			}
			return mismatches === 1;
		}
		function scorePrimaryField(field, token, tokenCondensed) {
			if (field.isAlias && (field.normalized === token || field.condensed === tokenCondensed)) {
				return SCORES.EXACT_ALIAS;
			}
			if (field.normalized === token || isPrimaryWordStart(field, token)) {
				return SCORES.PRIMARY_EXACT;
			}
			if (token.length >= 3 && (field.normalized.includes(token) || field.condensed.includes(tokenCondensed))) {
				return SCORES.PRIMARY_SUBSTRING;
			}
			if (!field.allowFuzzy) {
				return 0;
			}
			if (field.acronym !== '' && tokenCondensed === field.acronym) {
				return SCORES.ACRONYM;
			}
			if (tokenCondensed.length >= 4) {
				const span = getSubsequenceSpan(tokenCondensed, field.condensed);
				if (span !== 0 && span <= tokenCondensed.length * 1.8) {
					return SCORES.SUBSEQUENCE;
				}
			}
			if (tokenCondensed.length >= 5) {
				const candidates = new Set([field.condensed, ...field.words]);
				for (const candidate of candidates) {
					if (isSingleEditMatch(tokenCondensed, candidate)) {
						return SCORES.TYPO;
					}
				}
			}
			return 0;
		}
		function scoreSecondaryField(field, token, tokenCondensed) {
			if (field.normalized === token || field.condensed === tokenCondensed) {
				return SCORES.SECONDARY_EXACT;
			}
			if (token.length >= 3 && (field.normalized.includes(token) || field.condensed.includes(tokenCondensed))) {
				return SCORES.SECONDARY_SUBSTRING;
			}
			return 0;
		}
		function scoreField(field, token) {
			const tokenCondensed = token.replace(/\s+/g, '');
			if (tokenCondensed === '') {
				return 0;
			}
			return field.primary
				? scorePrimaryField(field, token, tokenCondensed)
				: scoreSecondaryField(field, token, tokenCondensed);
		}
		function evaluateEntry(entry, tokens, thresholds) {
			let total = 0;
			let hasQualifier = false;
			const tokenMatches = tokens.map((token) => {
				let bestScore = 0;
				let bestQualifierScore = 0;
				let bestFieldSource = null;
				entry.fields.forEach((field) => {
					const score = scoreField(field, token);
					if (score === 0) {
						return;
					}
					if (score > bestScore) {
						bestScore = score;
						bestFieldSource = field.source;
					}
					if (field.qualifies && score > bestQualifierScore) {
						bestQualifierScore = score;
					}
				});
				if (bestQualifierScore >= thresholds.minTokenScore) {
					hasQualifier = true;
				}
				total += bestScore;
				return {
					token,
					score: bestScore,
					qualifierScore: bestQualifierScore,
					fieldSource: bestFieldSource,
				};
			});
			const averageScore = tokens.length === 0 ? 0 : total / tokens.length;
			const matches = tokens.length > 0 && hasQualifier
				&& tokenMatches.every((match) => match.score >= thresholds.minTokenScore)
				&& averageScore >= thresholds.minAverageScore;
			return {
				...entry,
				matches,
				score: averageScore,
				tokenMatches,
			};
		}
		function runSearch(index, normalizedQuery, thresholds, stage) {
			const tokens = normalizedQuery === '' ? [] : normalizedQuery.split(' ');
			const results = index.map((entry) => evaluateEntry(entry, tokens, thresholds));
			return {
				query: normalizedQuery,
				tokens,
				stage,
				results,
				matches: results.filter((result) => result.matches),
			};
		}
		var searchCore = {
			SCORES,
			STRICT_THRESHOLDS,
			FALLBACK_THRESHOLDS,
			normalizeSearchText,
			toWords,
			toCondensed,
			buildAcronym,
			createField,
			getSubsequenceSpan,
			isSingleEditMatch,
			scorePrimaryField,
			scoreSecondaryField,
			scoreField,
			evaluateEntry,
			runSearch,
		};
		var search_core_default = searchCore;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipSearchCore = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
