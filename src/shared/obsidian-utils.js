// GENERATED from obsidian-utils.ts. Edit the TypeScript source only.
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

		// src/shared/obsidian-utils.ts
		var exports_obsidian_utils = {};
		__export(exports_obsidian_utils, {
			prepareMarkdownForObsidian: () => prepareMarkdownForObsidian,
			getObsidianTransportOptions: () => getObsidianTransportOptions,
			default: () => obsidian_utils_default,
			createObsidianSourceImageMap: () => createObsidianSourceImageMap,
		});
		module.exports = __toCommonJS(exports_obsidian_utils);
		function encodePathSegments(path) {
			return path.split('/').map((segment) => encodeURI(segment)).join('/');
		}
		function getBasename(path) {
			const parts = path.split('/');
			return parts[parts.length - 1] ?? '';
		}
		function tryDecodeUri(value) {
			try {
				return decodeURI(value);
			} catch {
				return value;
			}
		}
		function isUrlLike(value) {
			return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
		}
		function normalizeTarget(target) {
			return String(target ?? '').trim().replace(/^<|>$/g, '');
		}
		function resolveImageTarget(target, sourceImageMap = {}) {
			const normalized = normalizeTarget(target);
			if (normalized === '') {
				return null;
			}
			if (sourceImageMap[normalized] != null) {
				return sourceImageMap[normalized];
			}
			const decoded = tryDecodeUri(normalized);
			if (sourceImageMap[decoded] != null) {
				return sourceImageMap[decoded];
			}
			if (isUrlLike(normalized)) {
				return normalized;
			}
			return null;
		}
		function getObsidianTransportOptions(options = {}) {
			const nextOptions = {
				...options,
				downloadImages: false,
			};
			if (nextOptions.imageStyle !== 'noImage') {
				nextOptions.imageStyle = 'markdown';
			}
			return nextOptions;
		}
		function createObsidianSourceImageMap(imageList = {}) {
			const sourceImageMap = {};
			for (const [src, filename] of Object.entries(imageList)) {
				if (src === '' || filename === '') {
					continue;
				}
				sourceImageMap[filename] = src;
				sourceImageMap[encodePathSegments(filename)] = src;
				const basename = getBasename(filename);
				if (basename !== '') {
					sourceImageMap[basename] = src;
					sourceImageMap[encodeURI(basename)] = src;
				}
			}
			return sourceImageMap;
		}
		function prepareMarkdownForObsidian(markdown, sourceImageMap = {}) {
			if (markdown.length === 0) {
				return markdown;
			}
			let nextMarkdown = markdown;
			nextMarkdown = nextMarkdown.replace(/!\[\[([^\]\|]+)(?:\|[^\]]+)?\]\]/g, (match, target) => {
				const resolved = resolveImageTarget(target, sourceImageMap);
				return resolved !== null ? `![](${resolved})` : match;
			});
			nextMarkdown = nextMarkdown.replace(/!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g, (match, alt, target, suffix) => {
				const resolved = resolveImageTarget(target, sourceImageMap);
				return resolved !== null ? `![${alt}](${resolved}${suffix || ''})` : match;
			});
			nextMarkdown = nextMarkdown.replace(/^(\[[^\]]+\]:\s*)(\S+)(.*)$/gm, (match, prefix, target, suffix) => {
				const resolved = resolveImageTarget(target, sourceImageMap);
				return resolved !== null ? `${prefix}${resolved}${suffix}` : match;
			});
			return nextMarkdown;
		}
		var obsidianUtils = {
			createObsidianSourceImageMap,
			getObsidianTransportOptions,
			prepareMarkdownForObsidian,
		};
		var obsidian_utils_default = obsidianUtils;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipObsidian = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
