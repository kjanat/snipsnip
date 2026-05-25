import type { ClipResult } from './types';

export interface ClipEntry {
	id: string;
	url: string;
	title: string;
	byline: string | null;
	siteName: string | null;
	filename: string;
	markdown: string;
	contentHash: string;
	mode: 'document' | 'selection';
	savedAt: number;
	pinned: boolean;
}

export function hashContent(text: string): string {
	let a = 0x811c9dc5;
	for (let i = 0; i < text.length; i++) {
		a ^= text.charCodeAt(i);
		a = Math.imul(a, 0x01000193);
	}
	return (a >>> 0).toString(36);
}

export function buildEntry(result: ClipResult, filename: string): ClipEntry {
	return {
		id: crypto.randomUUID(),
		url: result.article.url,
		title: result.article.title,
		byline: result.article.byline,
		siteName: result.article.siteName,
		filename,
		markdown: result.markdown,
		contentHash: hashContent(result.markdown),
		mode: result.mode,
		savedAt: Date.now(),
		pinned: false,
	};
}

export function trimHistory(entries: ClipEntry[], limit: number): ClipEntry[] {
	const pinned = entries.filter((e) => e.pinned);
	const unpinned = entries.filter((e) => !e.pinned).slice(0, Math.max(1, limit));
	return [...pinned, ...unpinned];
}

const MS_PER_DAY = 86_400_000;

export function pruneExpired(entries: ClipEntry[], retentionDays: number): ClipEntry[] {
	const cutoff = Date.now() - retentionDays * MS_PER_DAY;
	return entries.filter((e) => e.pinned || e.savedAt >= cutoff);
}

export function searchLibrary(entries: ClipEntry[], query: string): ClipEntry[] {
	const trimmed = query.trim().toLowerCase();
	if (trimmed.length === 0) return entries;
	return entries.filter((entry) => {
		const haystack = [
			entry.title,
			entry.url,
			entry.byline ?? '',
			entry.siteName ?? '',
			entry.markdown,
		]
			.join(' ')
			.toLowerCase();
		return haystack.includes(trimmed);
	});
}
