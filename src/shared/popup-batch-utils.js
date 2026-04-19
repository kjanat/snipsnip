// GENERATED from popup-batch-utils.ts. Edit the TypeScript source only.
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

		// src/shared/popup-batch-utils.ts
		var exports_popup_batch_utils = {};
		__export(exports_popup_batch_utils, {
			summarizeUrlValidation: () => summarizeUrlValidation,
			processUrlInput: () => processUrlInput,
			parseMarkdownLink: () => parseMarkdownLink,
			normalizeUrl: () => normalizeUrl,
			isLikelyIncompleteMarkdown: () => isLikelyIncompleteMarkdown,
			default: () => popup_batch_utils_default,
		});
		module.exports = __toCommonJS(exports_popup_batch_utils);
		function parseMarkdownLink(text) {
			if (typeof text !== 'string') {
				return null;
			}
			const match = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
			if (match == null) {
				return null;
			}
			const title = match[1];
			const url = match[2];
			if (title == null || url == null) {
				return null;
			}
			return {
				title: title.trim(),
				url: url.trim(),
			};
		}
		function normalizeUrl(url) {
			if (typeof url !== 'string') {
				return null;
			}
			let normalized = url;
			if (!/^https?:\/\//i.test(normalized)) {
				normalized = `https://${normalized}`;
			}
			try {
				return new URL(normalized).href;
			} catch {
				return null;
			}
		}
		function processUrlInput(text) {
			const lines = String(text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
			const urlObjects = [];
			for (const line of lines) {
				const markdownLink = parseMarkdownLink(line);
				if (markdownLink !== null) {
					const normalizedUrl2 = normalizeUrl(markdownLink.url);
					if (normalizedUrl2 !== null) {
						urlObjects.push({
							title: markdownLink.title,
							url: normalizedUrl2,
						});
					}
					continue;
				}
				const normalizedUrl = normalizeUrl(line);
				if (normalizedUrl !== null) {
					urlObjects.push({
						title: null,
						url: normalizedUrl,
					});
				}
			}
			return urlObjects;
		}
		function summarizeUrlValidation(text) {
			const lines = String(text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
			if (lines.length === 0) {
				return {
					totalLines: 0,
					validCount: 0,
					invalidCount: 0,
					urlObjects: [],
					shouldDisableConvert: false,
				};
			}
			const urlObjects = [];
			let validCount = 0;
			let invalidCount = 0;
			for (const line of lines) {
				const markdownLink = parseMarkdownLink(line);
				const rawUrl = markdownLink?.url ?? line;
				const normalizedUrl = normalizeUrl(rawUrl);
				if (normalizedUrl === null) {
					invalidCount += 1;
					continue;
				}
				validCount += 1;
				urlObjects.push({
					title: markdownLink?.title ?? null,
					url: normalizedUrl,
				});
			}
			return {
				totalLines: lines.length,
				validCount,
				invalidCount,
				urlObjects,
				shouldDisableConvert: validCount === 0,
			};
		}
		function isLikelyIncompleteMarkdown(markdown) {
			if (markdown.trim() === '') {
				return true;
			}
			const normalized = markdown.replace(/\r/g, '');
			const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
			const headingLines = lines.filter((line) => /^#{1,6}\s/.test(line)).length;
			const listLines = lines.filter((line) => /^[-*+]\s/.test(line)).length;
			const nonStructuralLines = lines.filter((line) =>
				!/^#{1,6}\s/.test(line) && !/^[-*+]\s/.test(line) && !/^\d+\.\s/.test(line) && !/^>\s/.test(line)
				&& !/^!\[/.test(line)
			);
			const nonStructuralChars = nonStructuralLines.join(' ').replace(/`/g, '').trim().length;
			const hasTocMarker = /\bOn this page\b/i.test(normalized) || /\bTable of contents\b/i.test(normalized);
			return nonStructuralChars < 320 && headingLines + listLines >= 4 || hasTocMarker && nonStructuralChars < 500;
		}
		var popupBatchUtils = {
			parseMarkdownLink,
			normalizeUrl,
			processUrlInput,
			summarizeUrlValidation,
			isLikelyIncompleteMarkdown,
		};
		var popup_batch_utils_default = popupBatchUtils;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipPopupBatchUtils = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
