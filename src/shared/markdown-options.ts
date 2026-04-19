import type { ExtensionOptions } from '../lib/types/index.ts';
import {
	generateValidFileName as defaultGenerateValidFileName,
	textReplace as defaultTextReplace,
} from './template-utils.ts';

export function createEffectiveMarkdownOptions(
	article: Record<string, unknown>,
	providedOptions: Partial<ExtensionOptions> | Record<string, unknown> | null = null,
	downloadImages: boolean | null = null,
	deps: {
		textReplace?: (value: string, nextArticle: Record<string, unknown>, disallowedChars?: string | null) => string;
		generateValidFileName?: (value: unknown, disallowedChars?: string | null) => string;
		defaultOptions?: Partial<ExtensionOptions> | Record<string, unknown> | null;
	} = {},
): Record<string, unknown> {
	const textReplace = deps.textReplace ?? defaultTextReplace;
	const generateValidFileName = deps.generateValidFileName ?? defaultGenerateValidFileName;
	const fallbackDefaultOptions = deps.defaultOptions ?? globalThis.defaultOptions ?? {};
	const baseOptions = providedOptions ?? fallbackDefaultOptions;
	const normalizedBaseOptions = baseOptions == null ? {} : baseOptions;

	const options: {
		frontmatter: string;
		backmatter: string;
		imagePrefix: string;
		disallowedChars: string;
		tableFormatting?: unknown;
		includeTemplate?: boolean;
		downloadImages?: boolean;
		[key: string]: unknown;
	} = {
		frontmatter: '',
		backmatter: '',
		imagePrefix: '',
		disallowedChars: '',
		...normalizedBaseOptions,
		tableFormatting: normalizedBaseOptions.tableFormatting == null
			? undefined
			: { ...normalizedBaseOptions.tableFormatting },
	};

	if (downloadImages !== null) {
		options.downloadImages = downloadImages;
	}

	if (options.includeTemplate) {
		options.frontmatter = `${textReplace(String(options.frontmatter ?? ''), article)}\n`;
		options.backmatter = `\n${textReplace(String(options.backmatter ?? ''), article)}`;
	} else {
		options.frontmatter = '';
		options.backmatter = '';
	}

	options.imagePrefix = textReplace(String(options.imagePrefix ?? ''), article, String(options.disallowedChars ?? ''))
		.split('/')
		.map((segment) => generateValidFileName(segment, String(options.disallowedChars ?? '')))
		.join('/');

	return options;
}

const markdownOptions = {
	createEffectiveMarkdownOptions,
};

export default markdownOptions;
