import dayjs from 'dayjs';
import type { ExtractedArticle } from './types';

const DATE_TOKEN = /\{date:([^}]+)\}/g;

export function applyTemplate(template: string, article: ExtractedArticle): string {
	const now = dayjs();
	const tokens: Record<string, string> = {
		'{pageTitle}': article.title,
		'{baseURI}': article.url,
		'{byline}': article.byline ?? '',
		'{publishedTime}': article.publishedTime ?? '',
		'{excerpt}': article.excerpt ?? '',
		'{siteName}': article.siteName ?? '',
		'{hash}': article.hash,
	};
	let output = template;
	for (const [token, value] of Object.entries(tokens)) {
		output = output.split(token).join(value);
	}
	return output.replace(DATE_TOKEN, (_, pattern: string) => now.format(pattern));
}
