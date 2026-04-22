import type { ClipResult } from './types';

export interface ClipEntry {
	id: string;
	url: string;
	title: string;
	byline: string | null;
	siteName: string | null;
	filename: string;
	markdown: string;
	mode: 'document' | 'selection';
	savedAt: number;
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
		mode: result.mode,
		savedAt: Date.now(),
	};
}

export function trimHistory(entries: ClipEntry[], limit: number): ClipEntry[] {
	return entries.slice(0, Math.max(1, limit));
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
