import { zipSync } from 'fflate';

export interface ZipEntry {
	path: string;
	content: Uint8Array | string;
}

export function buildZipBlob(entries: ZipEntry[]): Blob {
	const encoder = new TextEncoder();
	const fileMap: Record<string, Uint8Array> = {};
	for (const entry of entries) {
		fileMap[entry.path] = typeof entry.content === 'string'
			? encoder.encode(entry.content)
			: entry.content;
	}
	const compressed = zipSync(fileMap);
	const buffer = new ArrayBuffer(compressed.byteLength);
	new Uint8Array(buffer).set(compressed);
	return new Blob([buffer], { type: 'application/zip' });
}

export function disambiguateFilename(taken: Map<string, number>, filename: string): string {
	const count = taken.get(filename) ?? 0;
	taken.set(filename, count + 1);
	if (count === 0) return filename;
	const dot = filename.lastIndexOf('.');
	const stem = dot > 0 ? filename.slice(0, dot) : filename;
	const ext = dot > 0 ? filename.slice(dot) : '';
	return `${stem} (${count})${ext}`;
}
