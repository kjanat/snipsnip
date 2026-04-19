export const COUNT_MODES: readonly ['chars', 'words', 'minRead', 'tokens'] = ['chars', 'words', 'minRead', 'tokens'];

export const DEFAULT_READING_WORDS_PER_MINUTE = 200;

export type CountMode = (typeof COUNT_MODES)[number];

function normalizeText(text: unknown): string {
	return String(text ?? '');
}

export function getWordCount(text: unknown): number {
	const normalized = normalizeText(text).trim();
	return normalized === '' ? 0 : normalized.split(/\s+/).length;
}

export function estimateTokens(text: unknown): number {
	let normalized = normalizeText(text);
	if (normalized === '') {
		return 0;
	}

	let total = 0;

	normalized = normalized.replace(/!?\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g, (_, label: string, url: string) => {
		total += Math.ceil(url.length / 2.5);
		total += 2;
		return label;
	});

	normalized = normalized.replace(/https?:\/\/[^\s\)>\]]+/g, (url: string) => {
		total += Math.ceil(url.length / 2.5);
		return '';
	});

	normalized = normalized.replace(/```[\s\S]*?```/g, (block: string) => {
		total += Math.ceil(block.length / 3);
		return '';
	});

	normalized = normalized.replace(/`[^`\n]+`/g, (code: string) => {
		total += Math.ceil(code.length / 3.5);
		return '';
	});

	normalized = normalized.replace(/&(?:#\d+|#x[\da-fA-F]+|[a-zA-Z]+);/g, () => {
		total += 1;
		return '';
	});

	normalized = normalized.replace(/[\u0080-\uFFFF]+/g, (chunk: string) => {
		total += Math.ceil(chunk.length * 1.5);
		return '';
	});

	normalized = normalized.replace(/\b\d[\d.,:\-\/]*\b/g, (num: string) => {
		total += Math.ceil(num.length / 2);
		return '';
	});

	normalized = normalized.replace(/^#{1,6}\s/gm, () => {
		total += 1;
		return '';
	});
	normalized = normalized.replace(/(\*{1,3}|_{1,3})/g, () => {
		total += 1;
		return '';
	});
	normalized = normalized.replace(/^[\-\*\+]\s/gm, () => {
		total += 1;
		return '';
	});
	normalized = normalized.replace(/^\d+\.\s/gm, () => {
		total += 1;
		return '';
	});
	normalized = normalized.replace(/^>\s?/gm, () => {
		total += 1;
		return '';
	});

	const remaining = normalized.replace(/\s+/g, ' ').trim();
	if (remaining.length > 0) {
		total += Math.ceil(remaining.length / 4);
	}

	return total;
}

export function estimateReadingMinutes(
	text: unknown,
	wordsPerMinute = DEFAULT_READING_WORDS_PER_MINUTE,
): number {
	const words = getWordCount(text);
	const normalizedWordsPerMinute = Number.isFinite(wordsPerMinute) && wordsPerMinute > 0
		? wordsPerMinute
		: DEFAULT_READING_WORDS_PER_MINUTE;

	if (words === 0) {
		return 0;
	}

	return Math.max(1, Math.ceil(words / normalizedWordsPerMinute));
}

export function formatCountDisplay(text: unknown, mode: CountMode | string): string {
	const normalized = normalizeText(text);

	if (mode === 'words') {
		return `${getWordCount(normalized).toLocaleString()} words`;
	}

	if (mode === 'minRead') {
		return `${estimateReadingMinutes(normalized).toLocaleString()} min read`;
	}

	if (mode === 'tokens') {
		return `${estimateTokens(normalized).toLocaleString()} tokens`;
	}

	return `${normalized.length.toLocaleString()} chars`;
}

const countUtils = {
	COUNT_MODES,
	DEFAULT_READING_WORDS_PER_MINUTE,
	getWordCount,
	estimateTokens,
	estimateReadingMinutes,
	formatCountDisplay,
};

export default countUtils;
