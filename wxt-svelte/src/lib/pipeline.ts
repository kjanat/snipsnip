import { convertHtmlToMarkdown } from './convert';
import { extractArticle } from './extract';
import { formatMarkdown } from './format';
import { settingsItem } from './storage';
import { applyTemplate } from './template';
import type { ClipMode, ClipResult } from './types';

export async function runClipPipeline(mode: ClipMode): Promise<ClipResult> {
	const settings = await settingsItem.getValue();
	const article = await extractArticle(mode, settings.siteRules, {
		resolveStyles: settings.resolveStyles,
	});

	const body = convertHtmlToMarkdown(article.content, settings);
	const frontmatter = settings.includeTemplate
		? applyTemplate(settings.frontmatter, article)
		: '';
	const backmatter = settings.includeTemplate
		? applyTemplate(settings.backmatter, article)
		: '';

	let assembled = `${frontmatter}${body}${backmatter}`.trim();
	if (settings.formatOutput) {
		assembled = await formatMarkdown(assembled);
	}

	return {
		article,
		frontmatter,
		mode,
		markdown: `${assembled}\n`,
	};
}
