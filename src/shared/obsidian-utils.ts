export interface ObsidianTransportOptions {
	downloadImages?: boolean;
	imageStyle?: string;
	[key: string]: unknown;
}

export type SourceImageMap = Record<string, string>;

function encodePathSegments(path: string): string {
	return path
		.split('/')
		.map((segment) => encodeURI(segment))
		.join('/');
}

function getBasename(path: string): string {
	const parts = path.split('/');
	return parts[parts.length - 1] ?? '';
}

function tryDecodeUri(value: string): string {
	try {
		return decodeURI(value);
	} catch {
		return value;
	}
}

function isUrlLike(value: string): boolean {
	return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function normalizeTarget(target: unknown): string {
	return String(target ?? '').trim().replace(/^<|>$/g, '');
}

function resolveImageTarget(target: unknown, sourceImageMap: SourceImageMap = {}): string | null {
	const normalized = normalizeTarget(target);
	if (normalized === '') {
		return null;
	}

	if (sourceImageMap[normalized] != null) {
		return sourceImageMap[normalized];
	}

	const decoded = tryDecodeUri(normalized);
	if (sourceImageMap[decoded] != null) {
		return sourceImageMap[decoded];
	}

	if (isUrlLike(normalized)) {
		return normalized;
	}

	return null;
}

export function getObsidianTransportOptions(options: ObsidianTransportOptions = {}): ObsidianTransportOptions {
	const nextOptions: ObsidianTransportOptions = {
		...options,
		downloadImages: false,
	};

	if (nextOptions.imageStyle !== 'noImage') {
		nextOptions.imageStyle = 'markdown';
	}

	return nextOptions;
}

export function createObsidianSourceImageMap(imageList: Record<string, string> = {}): SourceImageMap {
	const sourceImageMap: SourceImageMap = {};

	for (const [src, filename] of Object.entries(imageList)) {
		if (src === '' || filename === '') {
			continue;
		}

		sourceImageMap[filename] = src;
		sourceImageMap[encodePathSegments(filename)] = src;

		const basename = getBasename(filename);
		if (basename !== '') {
			sourceImageMap[basename] = src;
			sourceImageMap[encodeURI(basename)] = src;
		}
	}

	return sourceImageMap;
}

export function prepareMarkdownForObsidian(markdown: string, sourceImageMap: SourceImageMap = {}): string {
	if (markdown.length === 0) {
		return markdown;
	}

	let nextMarkdown = markdown;

	nextMarkdown = nextMarkdown.replace(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, (match, target: string) => {
		const resolved = resolveImageTarget(target, sourceImageMap);
		return resolved !== null ? `![](${resolved})` : match;
	});

	nextMarkdown = nextMarkdown.replace(
		/!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g,
		(match, alt: string, target: string, suffix: string) => {
			const resolved = resolveImageTarget(target, sourceImageMap);
			return resolved !== null ? `![${alt}](${resolved}${suffix || ''})` : match;
		},
	);

	nextMarkdown = nextMarkdown.replace(
		/^(\[[^\]]+\]:\s*)(\S+)(.*)$/gm,
		(match, prefix: string, target: string, suffix: string) => {
			const resolved = resolveImageTarget(target, sourceImageMap);
			return resolved !== null ? `${prefix}${resolved}${suffix}` : match;
		},
	);

	return nextMarkdown;
}

const obsidianUtils = {
	createObsidianSourceImageMap,
	getObsidianTransportOptions,
	prepareMarkdownForObsidian,
};

export default obsidianUtils;
