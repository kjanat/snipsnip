import dayjs from 'dayjs';
import type { ExtractedArticle } from './types';

const DATE_TOKEN = /\{date:([^}]+)\}/g;

function flattenToLine(value: string): string {
	return value.replace(/[\r\n]+/g, ' ').trim();
}

export function applyTemplate(template: string, article: ExtractedArticle): string {
	const now = dayjs();
	const tokens: Record<string, string> = {
		'{pageTitle}': flattenToLine(article.title),
		'{baseURI}': article.url,
		'{byline}': flattenToLine(article.byline ?? ''),
		'{publishedTime}': flattenToLine(article.publishedTime ?? ''),
		'{excerpt}': flattenToLine(article.excerpt ?? ''),
		'{siteName}': flattenToLine(article.siteName ?? ''),
		'{hash}': article.hash,
	};
	let output = template;
	for (const [token, value] of Object.entries(tokens)) {
		output = output.split(token).join(value);
	}
	return output.replace(DATE_TOKEN, (_, pattern: string) => now.format(pattern));
}
