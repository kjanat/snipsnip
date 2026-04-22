import { storage } from '#imports';
import { buildEntry, type ClipEntry, trimHistory } from './library';
import { settingsItem } from './storage';
import type { ClipResult } from './types';

export const libraryItem = storage.defineItem<ClipEntry[]>('local:library', {
	fallback: [],
	version: 1,
});

export async function recordClip(result: ClipResult, filename: string): Promise<ClipEntry> {
	const settings = await settingsItem.getValue();
	const entry = buildEntry(result, filename);
	const current = await libraryItem.getValue();
	await libraryItem.setValue(trimHistory([entry, ...current], settings.historyLimit));
	return entry;
}

export async function deleteClip(entryId: string): Promise<void> {
	const current = await libraryItem.getValue();
	await libraryItem.setValue(current.filter((c) => c.id !== entryId));
}

export async function clearLibrary(): Promise<void> {
	await libraryItem.setValue([]);
}
