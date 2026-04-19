// GENERATED from library-export.ts. Edit the TypeScript source only.
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

		// src/shared/library-export.ts
		var exports_library_export = {};
		__export(exports_library_export, {
			ensureUniqueLibraryExportPath: () => ensureUniqueLibraryExportPath,
			default: () => library_export_default,
			createLibraryExportZipFilename: () => createLibraryExportZipFilename,
			createLibraryExportFiles: () => createLibraryExportFiles,
		});
		module.exports = __toCommonJS(exports_library_export);

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

		// src/shared/library-export.ts
		function padNumber(value) {
			return String(value).padStart(2, '0');
		}
		function createLibraryExportZipFilename(date = new Date(), prefix = 'SnipSnip-library') {
			return [
				prefix,
				`${date.getFullYear()}${padNumber(date.getMonth() + 1)}${padNumber(date.getDate())}-${
					padNumber(date.getHours())
				}${padNumber(date.getMinutes())}${padNumber(date.getSeconds())}`,
			].join('-') + '.zip';
		}
		function ensureUniqueLibraryExportPath(filePath, usedPaths = new Set()) {
			let normalized = String(filePath ?? 'untitled.md').replace(/\\/g, '/').replace(/^\/+/, '');
			if (!normalized.endsWith('.md')) {
				normalized = `${normalized}.md`;
			}
			if (!usedPaths.has(normalized)) {
				usedPaths.add(normalized);
				return normalized;
			}
			const lastDot = normalized.lastIndexOf('.');
			const base = lastDot > 0 ? normalized.substring(0, lastDot) : normalized;
			const extension = lastDot > 0 ? normalized.substring(lastDot) : '';
			let suffix = 2;
			let candidate = `${base} (${suffix})${extension}`;
			while (usedPaths.has(candidate)) {
				suffix += 1;
				candidate = `${base} (${suffix})${extension}`;
			}
			usedPaths.add(candidate);
			return candidate;
		}
		function createLibraryExportFiles(items = [], options = {}) {
			const generateFileName = options.generateValidFileName ?? generateValidFileName;
			const ensureUniquePath = options.ensureUniquePath ?? ensureUniqueLibraryExportPath;
			const usedPaths = options.usedPaths ?? new Set();
			const disallowedChars = options.disallowedChars ?? null;
			return items.map((item) => {
				const normalizedTitle = String(item.title ?? '').trim() || 'Untitled';
				const sanitizedTitle = String(generateFileName(normalizedTitle, disallowedChars) || '').trim() || 'Untitled';
				return {
					filename: ensureUniquePath(`${sanitizedTitle}.md`, usedPaths),
					content: String(item.markdown ?? ''),
				};
			});
		}
		var libraryExport = {
			createLibraryExportZipFilename,
			ensureUniqueLibraryExportPath,
			createLibraryExportFiles,
		};
		var library_export_default = libraryExport;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipLibraryExport = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
