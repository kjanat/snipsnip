import { generateValidFileName as defaultGenerateValidFileName } from './template-utils';

function padNumber(value: number): string {
	return String(value).padStart(2, '0');
}

export function createLibraryExportZipFilename(date = new Date(), prefix = 'SnipSnip-library'): string {
	return [
		prefix,
		`${date.getFullYear()}${padNumber(date.getMonth() + 1)}${padNumber(date.getDate())}-${padNumber(date.getHours())}${
			padNumber(date.getMinutes())
		}${padNumber(date.getSeconds())}`,
	].join('-') + '.zip';
}

export function ensureUniqueLibraryExportPath(filePath: string, usedPaths = new Set<string>()): string {
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

export function createLibraryExportFiles(
	items: Array<Partial<{ title: string; markdown: string }>> = [],
	options: {
		generateValidFileName?: (value: unknown, disallowedChars?: string | null) => string;
		ensureUniquePath?: (filePath: string, usedPaths?: Set<string>) => string;
		usedPaths?: Set<string>;
		disallowedChars?: string | null;
	} = {},
): Array<{ filename: string; content: string }> {
	const generateFileName = options.generateValidFileName ?? defaultGenerateValidFileName;
	const ensureUniquePath = options.ensureUniquePath ?? ensureUniqueLibraryExportPath;
	const usedPaths = options.usedPaths ?? new Set<string>();
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

const libraryExport = {
	createLibraryExportZipFilename,
	ensureUniqueLibraryExportPath,
	createLibraryExportFiles,
};

export default libraryExport;
