// GENERATED from markdown-options.ts. Edit the TypeScript source only.
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

		// src/shared/markdown-options.ts
		var exports_markdown_options = {};
		__export(exports_markdown_options, {
			default: () => markdown_options_default,
			createEffectiveMarkdownOptions: () => createEffectiveMarkdownOptions,
		});
		module.exports = __toCommonJS(exports_markdown_options);

		// src/shared/template-utils.ts
		function getMomentLibrary(deps = {}) {
			if (typeof deps.moment === 'function') {
				return deps.moment;
			}
			if (typeof globalThis.moment === 'function') {
				return globalThis.moment;
			}
			return null;
		}
		function formatDate(now, format, deps = {}) {
			const momentLibrary = getMomentLibrary(deps);
			if (typeof momentLibrary === 'function') {
				return momentLibrary(now).format(format);
			}
			if (format === 'YYYY-MM-DD') {
				const year = now.getFullYear();
				const month = String(now.getMonth() + 1).padStart(2, '0');
				const day = String(now.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			}
			return now.toISOString();
		}
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
		function textReplace(value, article, disallowedChars = null, deps = {}) {
			let nextValue = String(value ?? '');
			for (const key in article) {
				if (!Object.prototype.hasOwnProperty.call(article, key) || key === 'content') {
					continue;
				}
				let replacement = String(article[key] ?? '');
				if (replacement !== '' && disallowedChars !== null && disallowedChars !== '') {
					replacement = generateValidFileName(replacement, disallowedChars) ?? '';
				}
				nextValue = nextValue.replace(new RegExp(`{${key}}`, 'g'), replacement).replace(
					new RegExp(`{${key}:kebab}`, 'g'),
					replacement.replace(/ /g, '-').toLowerCase(),
				).replace(new RegExp(`{${key}:snake}`, 'g'), replacement.replace(/ /g, '_').toLowerCase()).replace(
					new RegExp(`{${key}:camel}`, 'g'),
					replacement.replace(/ ./g, (segment) => segment.trim().toUpperCase()).replace(
						/^./,
						(segment) => segment.toLowerCase(),
					),
				).replace(
					new RegExp(`{${key}:pascal}`, 'g'),
					replacement.replace(/ ./g, (segment) => segment.trim().toUpperCase()).replace(
						/^./,
						(segment) => segment.toUpperCase(),
					),
				);
			}
			const now = new Date();
			const dateMatches = nextValue.match(/{date:(.+?)}/g);
			if (Array.isArray(dateMatches)) {
				dateMatches.forEach((match) => {
					const format = match.substring(6, match.length - 1);
					nextValue = nextValue.replaceAll(match, formatDate(now, format, deps));
				});
			}
			const keywordMatches = nextValue.match(/{keywords:?(.*)?}/g);
			if (Array.isArray(keywordMatches)) {
				keywordMatches.forEach((match) => {
					let separator = match.substring(10, match.length - 1);
					try {
						separator = JSON.parse(JSON.stringify(separator).replace(/\\\\/g, '\\'));
					} catch {}
					const keywordsSource = Array.isArray(article.keywords) ? article.keywords : [];
					const keywords = keywordsSource.map((keyword) => String(keyword ?? ''));
					nextValue = nextValue.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywords.join(separator));
				});
			}
			return nextValue.replace(/{(.*?)}/g, '');
		}

		// src/shared/markdown-options.ts
		function createEffectiveMarkdownOptions(article, providedOptions = null, downloadImages = null, deps = {}) {
			const textReplace2 = deps.textReplace ?? textReplace;
			const generateValidFileName2 = deps.generateValidFileName ?? generateValidFileName;
			const fallbackDefaultOptions = deps.defaultOptions ?? globalThis.defaultOptions ?? {};
			const baseOptions = providedOptions ?? fallbackDefaultOptions;
			const normalizedBaseOptions = baseOptions == null ? {} : baseOptions;
			const options = {
				frontmatter: '',
				backmatter: '',
				imagePrefix: '',
				disallowedChars: '',
				...normalizedBaseOptions,
				tableFormatting: normalizedBaseOptions.tableFormatting == null
					? undefined
					: { ...normalizedBaseOptions.tableFormatting },
			};
			if (downloadImages !== null) {
				options.downloadImages = downloadImages;
			}
			if (options.includeTemplate) {
				options.frontmatter = `${textReplace2(String(options.frontmatter ?? ''), article)}
		`;
				options.backmatter = `
		${textReplace2(String(options.backmatter ?? ''), article)}`;
			} else {
				options.frontmatter = '';
				options.backmatter = '';
			}
			options.imagePrefix = textReplace2(
				String(options.imagePrefix ?? ''),
				article,
				String(options.disallowedChars ?? ''),
			).split('/').map((segment) => generateValidFileName2(segment, String(options.disallowedChars ?? ''))).join('/');
			return options;
		}
		var markdownOptions = {
			createEffectiveMarkdownOptions,
		};
		var markdown_options_default = markdownOptions;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipMarkdownOptions = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
