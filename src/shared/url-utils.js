// GENERATED from url-utils.ts. Edit the TypeScript source only.
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

		// src/shared/url-utils.ts
		var exports_url_utils = {};
		__export(exports_url_utils, {
			validateUri: () => validateUri,
			safeParseUrl: () => safeParseUrl,
			resolveArticleUrl: () => resolveArticleUrl,
			getImageFilename: () => getImageFilename,
			default: () => url_utils_default,
		});
		module.exports = __toCommonJS(exports_url_utils);

		// src/shared/template-utils.ts
		function generateValidFileName(title, disallowedChars = null) {
			if (!title) {
				return title === null ? null : String(title ?? '');
			}
			let normalizedTitle = String(title);
			const illegalCharacters = /[\/\?<>\\:\*\|":]/g;
			let name = normalizedTitle.replace(illegalCharacters, '').replace(/\u00A0/g, ' ');
			if (disallowedChars !== null && disallowedChars !== '') {
				for (const character of disallowedChars) {
					const escapedCharacter = `[\\^$.|?*+()`.includes(character) ? `\\${character}` : character;
					name = name.replace(new RegExp(escapedCharacter, 'g'), '');
				}
			}
			return name;
		}

		// src/shared/url-utils.ts
		function safeParseUrl(urlString) {
			try {
				return new URL(urlString);
			} catch {
				return null;
			}
		}
		function resolveArticleUrl(domBaseUri, pageUrl = '') {
			const normalizedPageUrl = pageUrl.trim();
			const preferredUrl = normalizedPageUrl === '' ? null : safeParseUrl(normalizedPageUrl);
			if (preferredUrl !== null) {
				return preferredUrl;
			}
			return safeParseUrl(domBaseUri);
		}
		function validateUri(href, baseURI) {
			try {
				new URL(href);
				return href;
			} catch {
				const baseUrl = new URL(baseURI);
				if (href.startsWith('/')) {
					return `${baseUrl.origin}${href}`;
				}
				return `${baseUrl.href}${baseUrl.href.endsWith('/') ? '' : '/'}${href}`;
			}
		}
		function getImageFilename(src, options = {}, prependFilePath = true, deps = {}) {
			const sanitizeFilename = deps.generateValidFileName ?? generateValidFileName;
			const slashPosition = src.lastIndexOf('/');
			const queryPosition = src.indexOf('?');
			let filename = src.substring(slashPosition + 1, queryPosition > 0 ? queryPosition : src.length);
			let imagePrefix = String(options.imagePrefix ?? '');
			const title = String(options.title ?? '');
			if (prependFilePath && title.includes('/')) {
				imagePrefix = `${title.substring(0, title.lastIndexOf('/') + 1)}${imagePrefix}`;
			} else if (prependFilePath) {
				imagePrefix = `${title}${imagePrefix.startsWith('/') ? '' : '/'}${imagePrefix}`;
			}
			if (filename.includes(';base64,')) {
				filename = `image.${filename.substring(0, filename.indexOf(';'))}`;
			}
			const extension = filename.substring(filename.lastIndexOf('.'));
			if (extension === filename) {
				filename = `${filename}.idunno`;
			}
			return `${imagePrefix}${
				sanitizeFilename(filename, typeof options.disallowedChars === 'string' ? options.disallowedChars : null)
			}`;
		}
		var urlUtils = {
			safeParseUrl,
			resolveArticleUrl,
			validateUri,
			getImageFilename,
		};
		var url_utils_default = urlUtils;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipUrlUtils = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
