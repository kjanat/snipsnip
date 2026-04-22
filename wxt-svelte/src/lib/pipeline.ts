import { convertHtmlToMarkdown } from './convert';
import { extractArticle } from './extract';
import { settingsItem } from './storage';
import { applyTemplate } from './template';
import type { ClipMode, ClipResult } from './types';

export async function runClipPipeline(mode: ClipMode): Promise<ClipResult> {
	const settings = await settingsItem.getValue();
	const article = await extractArticle(mode, settings.siteRules);

	const body = convertHtmlToMarkdown(article.content, settings);
	const frontmatter = settings.includeTemplate
		? applyTemplate(settings.frontmatter, article)
		: '';
	const backmatter = settings.includeTemplate
		? applyTemplate(settings.backmatter, article)
		: '';

	return {
		article,
		frontmatter,
		mode,
		markdown: `${`${frontmatter}${body}${backmatter}`.trim()}\n`,
	};
}
