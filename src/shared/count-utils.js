// GENERATED from count-utils.ts. Edit the TypeScript source only.
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

		// src/shared/count-utils.ts
		var exports_count_utils = {};
		__export(exports_count_utils, {
			getWordCount: () => getWordCount,
			formatCountDisplay: () => formatCountDisplay,
			estimateTokens: () => estimateTokens,
			estimateReadingMinutes: () => estimateReadingMinutes,
			default: () => count_utils_default,
			DEFAULT_READING_WORDS_PER_MINUTE: () => DEFAULT_READING_WORDS_PER_MINUTE,
			COUNT_MODES: () => COUNT_MODES,
		});
		module.exports = __toCommonJS(exports_count_utils);
		var COUNT_MODES = ['chars', 'words', 'minRead', 'tokens'];
		var DEFAULT_READING_WORDS_PER_MINUTE = 200;
		function normalizeText(text) {
			return String(text ?? '');
		}
		function getWordCount(text) {
			const normalized = normalizeText(text).trim();
			return normalized === '' ? 0 : normalized.split(/\s+/).length;
		}
		function estimateTokens(text) {
			let normalized = normalizeText(text);
			if (normalized === '') {
				return 0;
			}
			let total = 0;
			normalized = normalized.replace(/!?\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g, (_, label, url) => {
				total += Math.ceil(url.length / 2.5);
				total += 2;
				return label;
			});
			normalized = normalized.replace(/https?:\/\/[^\s\)>\]]+/g, (url) => {
				total += Math.ceil(url.length / 2.5);
				return '';
			});
			normalized = normalized.replace(/```[\s\S]*?```/g, (block) => {
				total += Math.ceil(block.length / 3);
				return '';
			});
			normalized = normalized.replace(/`[^`\n]+`/g, (code) => {
				total += Math.ceil(code.length / 3.5);
				return '';
			});
			normalized = normalized.replace(/&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g, () => {
				total += 1;
				return '';
			});
			normalized = normalized.replace(/[\u0080-\uFFFF]+/g, (chunk) => {
				total += Math.ceil(chunk.length * 1.5);
				return '';
			});
			normalized = normalized.replace(/\b\d[\d.,:\-\/]*\b/g, (num) => {
				total += Math.ceil(num.length / 2);
				return '';
			});
			normalized = normalized.replace(/^#{1,6}\s/gm, () => {
				total += 1;
				return '';
			});
			normalized = normalized.replace(/(\*{1,3}|_{1,3})/g, () => {
				total += 1;
				return '';
			});
			normalized = normalized.replace(/^[\-\*\+]\s/gm, () => {
				total += 1;
				return '';
			});
			normalized = normalized.replace(/^\d+\.\s/gm, () => {
				total += 1;
				return '';
			});
			normalized = normalized.replace(/^>\s?/gm, () => {
				total += 1;
				return '';
			});
			const remaining = normalized.replace(/\s+/g, ' ').trim();
			if (remaining.length > 0) {
				total += Math.ceil(remaining.length / 4);
			}
			return total;
		}
		function estimateReadingMinutes(text, wordsPerMinute = DEFAULT_READING_WORDS_PER_MINUTE) {
			const words = getWordCount(text);
			const normalizedWordsPerMinute = Number.isFinite(wordsPerMinute) && wordsPerMinute > 0
				? wordsPerMinute
				: DEFAULT_READING_WORDS_PER_MINUTE;
			if (words === 0) {
				return 0;
			}
			return Math.max(1, Math.ceil(words / normalizedWordsPerMinute));
		}
		function formatCountDisplay(text, mode) {
			const normalized = normalizeText(text);
			if (mode === 'words') {
				return `${getWordCount(normalized).toLocaleString()} words`;
			}
			if (mode === 'minRead') {
				return `${estimateReadingMinutes(normalized).toLocaleString()} min read`;
			}
			if (mode === 'tokens') {
				return `${estimateTokens(normalized).toLocaleString()} tokens`;
			}
			return `${normalized.length.toLocaleString()} chars`;
		}
		var countUtils = {
			COUNT_MODES,
			DEFAULT_READING_WORDS_PER_MINUTE,
			getWordCount,
			estimateTokens,
			estimateReadingMinutes,
			formatCountDisplay,
		};
		var count_utils_default = countUtils;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipCountUtils = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
