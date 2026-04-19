import { generateValidFileName as defaultGenerateValidFileName } from './template-utils';

export function safeParseUrl(urlString: string): URL | null {
	try {
		return new URL(urlString);
	} catch {
		return null;
	}
}

export function resolveArticleUrl(domBaseUri: string, pageUrl = ''): URL | null {
	const normalizedPageUrl = pageUrl.trim();
	const preferredUrl = normalizedPageUrl === '' ? null : safeParseUrl(normalizedPageUrl);
	if (preferredUrl !== null) {
		return preferredUrl;
	}

	return safeParseUrl(domBaseUri);
}

export function validateUri(href: string, baseURI: string): string {
	try {
		new URL(href);
		return href;
	} catch {
		const baseUrl = new URL(baseURI);
		if (href.startsWith('/')) {
			return `${baseUrl.origin}${href}`;
		}

		return `${baseUrl.href}${baseUrl.href.endsWith('/') ? '' : '/'}${href}`;
	}
}

export function getImageFilename(
	src: string,
	options: Record<string, unknown> = {},
	prependFilePath = true,
	deps: {
		generateValidFileName?: (value: unknown, disallowedChars?: string | null) => string;
	} = {},
): string {
	const sanitizeFilename = deps.generateValidFileName ?? defaultGenerateValidFileName;

	const slashPosition = src.lastIndexOf('/');
	const queryPosition = src.indexOf('?');
	let filename = src.substring(slashPosition + 1, queryPosition > 0 ? queryPosition : src.length);

	let imagePrefix = String(options.imagePrefix ?? '');
	const title = String(options.title ?? '');

	if (prependFilePath && title.includes('/')) {
		imagePrefix = `${title.substring(0, title.lastIndexOf('/') + 1)}${imagePrefix}`;
	} else if (prependFilePath) {
		imagePrefix = `${title}${imagePrefix.startsWith('/') ? '' : '/'}${imagePrefix}`;
	}

	if (filename.includes(';base64,')) {
		filename = `image.${filename.substring(0, filename.indexOf(';'))}`;
	}

	const extension = filename.substring(filename.lastIndexOf('.'));
	if (extension === filename) {
		filename = `${filename}.idunno`;
	}

	return `${imagePrefix}${
		sanitizeFilename(filename, typeof options.disallowedChars === 'string' ? options.disallowedChars : null)
	}`;
}

const urlUtils = {
	safeParseUrl,
	resolveArticleUrl,
	validateUri,
	getImageFilename,
};

export default urlUtils;
