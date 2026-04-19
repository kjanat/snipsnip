import type { ClipSnapshot, ExtensionStorageArea, LibraryItem, LibrarySettings } from '@/lib/types/index.ts';

export const STORAGE_KEYS = Object.freeze({
	SETTINGS: 'librarySettings',
	ITEMS: 'libraryItems',
});

export const DEFAULT_LIBRARY_SETTINGS: Readonly<LibrarySettings> = Object.freeze({
	enabled: true,
	autoSaveOnPopupOpen: true,
	itemsToKeep: 10,
});

function deepClone<T>(value: T): T {
	return structuredClone(value);
}

function getDefaultStorage(): ExtensionStorageArea | undefined {
	return browser?.storage?.local;
}

export function sanitizeItemsToKeep(value: unknown, fallback = DEFAULT_LIBRARY_SETTINGS.itemsToKeep): number {
	const parsed = Number.parseInt(String(value ?? '').trim(), 10);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return fallback;
	}

	return parsed;
}

export function normalizeLibrarySettings(settings: Partial<LibrarySettings> | unknown = {}): LibrarySettings {
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

export function normalizePageUrl(url = ''): string {
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

function stripMarkdown(markdown = ''): string {
	return markdown
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
		.replace(/^>\s?/gm, '')
		.replace(/^#{1,6}\s+/gm, '')
		.replace(/[*_~]+/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

export function buildPreviewText(markdown = '', maxLength = 180): string {
	const plainText = stripMarkdown(markdown);
	if (plainText === '') {
		return '';
	}

	if (plainText.length <= maxLength) {
		return plainText;
	}

	return `${plainText.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function trimLibraryItems(
	items: LibraryItem[] = [],
	itemsToKeep = DEFAULT_LIBRARY_SETTINGS.itemsToKeep,
): LibraryItem[] {
	const maxItems = sanitizeItemsToKeep(itemsToKeep);
	return items.slice(0, maxItems).map((item) => deepClone(item));
}

export function createLibraryItem(
	snapshot: Partial<ClipSnapshot> = {},
	savedAt = new Date().toISOString(),
): LibraryItem {
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

export function upsertLibraryItem(
	items: LibraryItem[] = [],
	nextItem: Partial<ClipSnapshot> = {},
	itemsToKeep = DEFAULT_LIBRARY_SETTINGS.itemsToKeep,
): LibraryItem[] {
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

export async function loadLibrarySettings(storage = getDefaultStorage()): Promise<LibrarySettings> {
	if (storage?.get == null) {
		return normalizeLibrarySettings();
	}

	const stored = await storage.get(STORAGE_KEYS.SETTINGS);
	return normalizeLibrarySettings(stored[STORAGE_KEYS.SETTINGS]);
}

export async function saveLibrarySettings(
	settings: Partial<LibrarySettings>,
	storage = getDefaultStorage(),
): Promise<LibrarySettings> {
	const normalized = normalizeLibrarySettings(settings);
	if (storage?.set != null) {
		await storage.set({ [STORAGE_KEYS.SETTINGS]: normalized });
	}

	return normalized;
}

export async function resetLibrarySettings(storage = getDefaultStorage()): Promise<LibrarySettings> {
	return saveLibrarySettings(DEFAULT_LIBRARY_SETTINGS, storage);
}

export async function loadLibraryItems(storage = getDefaultStorage()): Promise<LibraryItem[]> {
	if (storage?.get == null) {
		return [];
	}

	const stored = await storage.get(STORAGE_KEYS.ITEMS);
	const storedItems = stored[STORAGE_KEYS.ITEMS];
	return Array.isArray(storedItems) ? storedItems.map((item) => deepClone(item)) : [];
}

export async function saveLibraryItems(items: LibraryItem[], storage = getDefaultStorage()): Promise<LibraryItem[]> {
	const normalizedItems = items.map((item) => deepClone(item));
	if (storage?.set != null) {
		await storage.set({ [STORAGE_KEYS.ITEMS]: normalizedItems });
	}

	return normalizedItems;
}

export async function clearLibraryItems(storage = getDefaultStorage()): Promise<LibraryItem[]> {
	if (storage?.remove != null) {
		await storage.remove(STORAGE_KEYS.ITEMS);
	}

	return [];
}

export async function trimStoredLibraryItems(
	itemsToKeep: number,
	storage = getDefaultStorage(),
): Promise<LibraryItem[]> {
	const currentItems = await loadLibraryItems(storage);
	const trimmedItems = trimLibraryItems(currentItems, itemsToKeep);
	return saveLibraryItems(trimmedItems, storage);
}

const libraryState = {
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

export default libraryState;
