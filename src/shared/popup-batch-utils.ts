export interface MarkdownLink {
	title: string;
	url: string;
}

export interface UrlObject {
	title: string | null;
	url: string;
}

export interface UrlValidationSummary {
	totalLines: number;
	validCount: number;
	invalidCount: number;
	urlObjects: UrlObject[];
	shouldDisableConvert: boolean;
}

export function parseMarkdownLink(text: unknown): MarkdownLink | null {
	if (typeof text !== 'string') {
		return null;
	}

	const match = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
	if (match == null) {
		return null;
	}

	const title = match[1];
	const url = match[2];
	if (title == null || url == null) {
		return null;
	}

	return {
		title: title.trim(),
		url: url.trim(),
	};
}

export function normalizeUrl(url: unknown): string | null {
	if (typeof url !== 'string') {
		return null;
	}

	let normalized = url;
	if (!/^https?:\/\//i.test(normalized)) {
		normalized = `https://${normalized}`;
	}

	try {
		return new URL(normalized).href;
	} catch {
		return null;
	}
}

export function processUrlInput(text: unknown): UrlObject[] {
	const lines = String(text ?? '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	const urlObjects: UrlObject[] = [];
	for (const line of lines) {
		const markdownLink = parseMarkdownLink(line);
		if (markdownLink !== null) {
			const normalizedUrl = normalizeUrl(markdownLink.url);
			if (normalizedUrl !== null) {
				urlObjects.push({
					title: markdownLink.title,
					url: normalizedUrl,
				});
			}
			continue;
		}

		const normalizedUrl = normalizeUrl(line);
		if (normalizedUrl !== null) {
			urlObjects.push({
				title: null,
				url: normalizedUrl,
			});
		}
	}

	return urlObjects;
}

export function summarizeUrlValidation(text: unknown): UrlValidationSummary {
	const lines = String(text ?? '')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length === 0) {
		return {
			totalLines: 0,
			validCount: 0,
			invalidCount: 0,
			urlObjects: [],
			shouldDisableConvert: false,
		};
	}

	const urlObjects: UrlObject[] = [];
	let validCount = 0;
	let invalidCount = 0;

	for (const line of lines) {
		const markdownLink = parseMarkdownLink(line);
		const rawUrl = markdownLink?.url ?? line;
		const normalizedUrl = normalizeUrl(rawUrl);

		if (normalizedUrl === null) {
			invalidCount += 1;
			continue;
		}

		validCount += 1;
		urlObjects.push({
			title: markdownLink?.title ?? null,
			url: normalizedUrl,
		});
	}

	return {
		totalLines: lines.length,
		validCount,
		invalidCount,
		urlObjects,
		shouldDisableConvert: validCount === 0,
	};
}

export function isLikelyIncompleteMarkdown(markdown: string): boolean {
	if (markdown.trim() === '') {
		return true;
	}

	const normalized = markdown.replace(/\r/g, '');
	const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const headingLines = lines.filter((line) => /^#{1,6}\s/.test(line)).length;
	const listLines = lines.filter((line) => /^[-*+]\s/.test(line)).length;
	const nonStructuralLines = lines.filter((line) => (
		!/^#{1,6}\s/.test(line)
		&& !/^[-*+]\s/.test(line)
		&& !/^\d+\.\s/.test(line)
		&& !/^>\s/.test(line)
		&& !/^!\[/.test(line)
	));
	const nonStructuralChars = nonStructuralLines.join(' ').replace(/`/g, '').trim().length;
	const hasTocMarker = /\bOn this page\b/i.test(normalized) || /\bTable of contents\b/i.test(normalized);

	return (
		nonStructuralChars < 320
		&& (headingLines + listLines) >= 4
	) || (
		hasTocMarker
		&& nonStructuralChars < 500
	);
}

const popupBatchUtils = {
	parseMarkdownLink,
	normalizeUrl,
	processUrlInput,
	summarizeUrlValidation,
	isLikelyIncompleteMarkdown,
};

export default popupBatchUtils;
