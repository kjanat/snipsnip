import type { ExtractedArticle } from './types';

const DATE_TOKEN = /\{date:([^}]+)\}/g;

function pad(value: number, width = 2): string {
	return value.toString().padStart(width, '0');
}

function formatDate(now: Date, pattern: string): string {
	const replacements: Record<string, string> = {
		YYYY: now.getFullYear().toString(),
		MM: pad(now.getMonth() + 1),
		DD: pad(now.getDate()),
		HH: pad(now.getHours()),
		mm: pad(now.getMinutes()),
		ss: pad(now.getSeconds()),
	};
	return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => replacements[token] ?? token);
}

export function applyTemplate(template: string, article: ExtractedArticle): string {
	const now = new Date();
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
	return output.replace(DATE_TOKEN, (_, pattern: string) => formatDate(now, pattern));
}
