import { storage } from '#imports';
import { buildEntry, type ClipEntry, pruneExpired, trimHistory } from './library';
import { settingsItem } from './storage';
import type { ClipResult } from './types';

export const libraryItem = storage.defineItem<ClipEntry[]>('local:library', {
	fallback: [],
	version: 2,
	migrations: {
		2: (entries: { pinned?: boolean }[]) => entries.map((e) => ({ ...e, pinned: e.pinned ?? false })),
	},
});

export async function recordClip(result: ClipResult, filename: string): Promise<ClipEntry | null> {
	const current = await libraryItem.getValue();
	if (current.some((e) => e.markdown === result.markdown)) return null;
	const settings = await settingsItem.getValue();
	const entry = buildEntry(result, filename);
	await libraryItem.setValue(trimHistory([entry, ...current], settings.historyLimit));
	return entry;
}

export async function pinClip(entryId: string): Promise<void> {
	const current = await libraryItem.getValue();
	await libraryItem.setValue(current.map((e) => (e.id === entryId ? { ...e, pinned: true } : e)));
}

export async function unpinClip(entryId: string): Promise<void> {
	const current = await libraryItem.getValue();
	await libraryItem.setValue(current.map((e) => (e.id === entryId ? { ...e, pinned: false } : e)));
}

export async function deleteClip(entryId: string): Promise<void> {
	const current = await libraryItem.getValue();
	await libraryItem.setValue(current.filter((c) => c.id !== entryId));
}

export async function clearHistory(): Promise<void> {
	const current = await libraryItem.getValue();
	await libraryItem.setValue(current.filter((e) => e.pinned));
}

export async function pruneExpiredHistory(): Promise<void> {
	const settings = await settingsItem.getValue();
	const current = await libraryItem.getValue();
	const pruned = pruneExpired(current, settings.historyRetentionDays);
	if (pruned.length < current.length) {
		await libraryItem.setValue(pruned);
	}
}
