import { Readability } from '@mozilla/readability';
import { zipSync } from 'fflate';
import { convertHtmlToMarkdown } from './convert';
import { sanitizeFilename, withMarkdownExtension } from './filename';
import { settingsItem } from './storage';
import { applyTemplate } from './template';
import type { ExtractedArticle } from './types';

export interface BatchItem {
	url: string;
	status: 'pending' | 'fetching' | 'done' | 'error';
	filename?: string;
	error?: string;
}

interface ParsedDoc {
	html: string;
	title: string;
	byline: string | null;
	excerpt: string | null;
	siteName: string | null;
	lang: string | null;
	textContent: string;
}

function parseHtml(raw: string, fallbackTitle: string): ParsedDoc {
	const doc = new DOMParser().parseFromString(raw, 'text/html');
	const article = new Readability(doc).parse();
	return {
		html: article?.content ?? doc.body.innerHTML,
		title: article?.title?.trim() || doc.title || fallbackTitle,
		byline: article?.byline ?? null,
		excerpt: article?.excerpt ?? null,
		siteName: article?.siteName ?? null,
		lang: article?.lang ?? doc.documentElement.lang ?? null,
		textContent: article?.textContent ?? '',
	};
}

async function digest(input: string): Promise<string> {
	const buffer = new TextEncoder().encode(input);
	const hashed = await crypto.subtle.digest('SHA-1', buffer);
	return Array.from(new Uint8Array(hashed))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 12);
}

export async function fetchAndConvert(url: string): Promise<{
	markdown: string;
	filename: string;
}> {
	const response = await fetch(url, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	const raw = await response.text();
	const parsed = parseHtml(raw, url);
	const article: ExtractedArticle = {
		title: parsed.title,
		byline: parsed.byline,
		excerpt: parsed.excerpt,
		content: parsed.html,
		textContent: parsed.textContent,
		siteName: parsed.siteName,
		lang: parsed.lang,
		publishedTime: null,
		url,
		hash: await digest(`${url}::${parsed.html}`),
	};

	const settings = await settingsItem.getValue();
	const body = convertHtmlToMarkdown(parsed.html, settings);
	const frontmatter = settings.includeTemplate
		? applyTemplate(settings.frontmatter, article)
		: '';
	const backmatter = settings.includeTemplate
		? applyTemplate(settings.backmatter, article)
		: '';
	const markdown = `${`${frontmatter}${body}${backmatter}`.trim()}\n`;
	const filename = withMarkdownExtension(
		sanitizeFilename(applyTemplate(settings.title, article)),
	);
	return { markdown, filename };
}

export function buildZip(entries: { filename: string; markdown: string }[]): Blob {
	const seen = new Map<string, number>();
	const fileMap: Record<string, Uint8Array> = {};
	const encoder = new TextEncoder();
	for (const entry of entries) {
		let name = entry.filename;
		const count = seen.get(name) ?? 0;
		if (count > 0) {
			const dot = name.lastIndexOf('.');
			const stem = dot > 0 ? name.slice(0, dot) : name;
			const ext = dot > 0 ? name.slice(dot) : '';
			name = `${stem} (${count})${ext}`;
		}
		seen.set(entry.filename, count + 1);
		fileMap[name] = encoder.encode(entry.markdown);
	}
	const compressed = zipSync(fileMap);
	const buffer = new ArrayBuffer(compressed.byteLength);
	new Uint8Array(buffer).set(compressed);
	return new Blob([buffer], { type: 'application/zip' });
}

export function parseUrlList(input: string): string[] {
	return input
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.filter((line) => /^https?:\/\//i.test(line));
}
