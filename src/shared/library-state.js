// GENERATED from library-state.ts. Edit the TypeScript source only.
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

		// src/shared/library-state.ts
		var exports_library_state = {};
		__export(exports_library_state, {
			upsertLibraryItem: () => upsertLibraryItem,
			trimStoredLibraryItems: () => trimStoredLibraryItems,
			trimLibraryItems: () => trimLibraryItems,
			saveLibrarySettings: () => saveLibrarySettings,
			saveLibraryItems: () => saveLibraryItems,
			sanitizeItemsToKeep: () => sanitizeItemsToKeep,
			resetLibrarySettings: () => resetLibrarySettings,
			normalizePageUrl: () => normalizePageUrl,
			normalizeLibrarySettings: () => normalizeLibrarySettings,
			loadLibrarySettings: () => loadLibrarySettings,
			loadLibraryItems: () => loadLibraryItems,
			default: () => library_state_default,
			createLibraryItem: () => createLibraryItem,
			clearLibraryItems: () => clearLibraryItems,
			buildPreviewText: () => buildPreviewText,
			STORAGE_KEYS: () => STORAGE_KEYS,
			DEFAULT_LIBRARY_SETTINGS: () => DEFAULT_LIBRARY_SETTINGS,
		});
		module.exports = __toCommonJS(exports_library_state);
		var STORAGE_KEYS = Object.freeze({
			SETTINGS: 'librarySettings',
			ITEMS: 'libraryItems',
		});
		var DEFAULT_LIBRARY_SETTINGS = Object.freeze({
			enabled: true,
			autoSaveOnPopupOpen: true,
			itemsToKeep: 10,
		});
		function deepClone(value) {
			return structuredClone(value);
		}
		function getDefaultStorage() {
			return globalThis.browser?.storage?.local;
		}
		function sanitizeItemsToKeep(value, fallback = DEFAULT_LIBRARY_SETTINGS.itemsToKeep) {
			const parsed = Number.parseInt(String(value ?? '').trim(), 10);
			if (!Number.isFinite(parsed) || parsed < 1) {
				return fallback;
			}
			return parsed;
		}
		function normalizeLibrarySettings(settings = {}) {
			const normalizedSettings = typeof settings === 'object' && settings !== null ? settings : {};
			const merged = {
				...deepClone(DEFAULT_LIBRARY_SETTINGS),
				...deepClone(normalizedSettings),
			};
			return {
				enabled: merged.enabled !== false,
				autoSaveOnPopupOpen: merged.autoSaveOnPopupOpen !== false,
				itemsToKeep: sanitizeItemsToKeep(merged.itemsToKeep),
			};
		}
		function normalizePageUrl(url = '') {
			if (typeof url !== 'string' || url === '') {
				return '';
			}
			try {
				const parsed = new URL(url);
				parsed.hash = '';
				return parsed.href;
			} catch {
				return url.trim();
			}
		}
		function stripMarkdown(markdown = '') {
			return markdown.replace(/```[\s\S]*?```/g, ' ').replace(/`([^`]+)`/g, '$1').replace(
				/!\[([^\]]*)\]\(([^)]+)\)/g,
				'$1',
			).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1').replace(/^>\s?/gm, '').replace(/^#{1,6}\s+/gm, '').replace(
				/[*_~]+/g,
				'',
			).replace(/\s+/g, ' ').trim();
		}
		function buildPreviewText(markdown = '', maxLength = 180) {
			const plainText = stripMarkdown(markdown);
			if (plainText === '') {
				return '';
			}
			if (plainText.length <= maxLength) {
				return plainText;
			}
			return `${plainText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
		}
		function trimLibraryItems(items = [], itemsToKeep = DEFAULT_LIBRARY_SETTINGS.itemsToKeep) {
			const maxItems = sanitizeItemsToKeep(itemsToKeep);
			return items.slice(0, maxItems).map((item) => deepClone(item));
		}
		function createLibraryItem(snapshot = {}, savedAt = new Date().toISOString()) {
			const pageUrl = String(snapshot.pageUrl ?? '').trim();
			const normalizedPageUrl = normalizePageUrl(pageUrl);
			const title = String(snapshot.title ?? '').trim() || 'Untitled';
			const markdown = String(snapshot.markdown ?? '');
			const timestamp = savedAt || new Date().toISOString();
			return {
				id: String(snapshot.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`),
				pageUrl,
				normalizedPageUrl,
				title,
				markdown,
				savedAt: timestamp,
				previewText: buildPreviewText(markdown),
			};
		}
		function upsertLibraryItem(items = [], nextItem = {}, itemsToKeep = DEFAULT_LIBRARY_SETTINGS.itemsToKeep) {
			const preparedItem = createLibraryItem(nextItem, nextItem.savedAt);
			const normalizedUrl = preparedItem.normalizedPageUrl;
			const dedupedItems = items.filter((item) => {
				if (normalizedUrl === '') {
					return item.id !== preparedItem.id;
				}
				return normalizePageUrl(item.normalizedPageUrl || item.pageUrl || '') !== normalizedUrl;
			});
			return trimLibraryItems([preparedItem, ...dedupedItems], itemsToKeep);
		}
		async function loadLibrarySettings(storage = getDefaultStorage()) {
			if (storage?.get == null) {
				return normalizeLibrarySettings();
			}
			const stored = await storage.get(STORAGE_KEYS.SETTINGS);
			return normalizeLibrarySettings(stored[STORAGE_KEYS.SETTINGS]);
		}
		async function saveLibrarySettings(settings, storage = getDefaultStorage()) {
			const normalized = normalizeLibrarySettings(settings);
			if (storage?.set != null) {
				await storage.set({ [STORAGE_KEYS.SETTINGS]: normalized });
			}
			return normalized;
		}
		async function resetLibrarySettings(storage = getDefaultStorage()) {
			return saveLibrarySettings(DEFAULT_LIBRARY_SETTINGS, storage);
		}
		async function loadLibraryItems(storage = getDefaultStorage()) {
			if (storage?.get == null) {
				return [];
			}
			const stored = await storage.get(STORAGE_KEYS.ITEMS);
			const storedItems = stored[STORAGE_KEYS.ITEMS];
			return Array.isArray(storedItems) ? storedItems.map((item) => deepClone(item)) : [];
		}
		async function saveLibraryItems(items, storage = getDefaultStorage()) {
			const normalizedItems = items.map((item) => deepClone(item));
			if (storage?.set != null) {
				await storage.set({ [STORAGE_KEYS.ITEMS]: normalizedItems });
			}
			return normalizedItems;
		}
		async function clearLibraryItems(storage = getDefaultStorage()) {
			if (storage?.remove != null) {
				await storage.remove(STORAGE_KEYS.ITEMS);
			}
			return [];
		}
		async function trimStoredLibraryItems(itemsToKeep, storage = getDefaultStorage()) {
			const currentItems = await loadLibraryItems(storage);
			const trimmedItems = trimLibraryItems(currentItems, itemsToKeep);
			return saveLibraryItems(trimmedItems, storage);
		}
		var libraryState = {
			STORAGE_KEYS,
			DEFAULT_LIBRARY_SETTINGS,
			sanitizeItemsToKeep,
			normalizeLibrarySettings,
			normalizePageUrl,
			buildPreviewText,
			createLibraryItem,
			upsertLibraryItem,
			trimLibraryItems,
			loadLibrarySettings,
			saveLibrarySettings,
			resetLibrarySettings,
			loadLibraryItems,
			saveLibraryItems,
			clearLibraryItems,
			trimStoredLibraryItems,
		};
		var library_state_default = libraryState;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipLibraryState = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
