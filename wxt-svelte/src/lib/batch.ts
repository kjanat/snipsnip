import { Readability } from '@mozilla/readability';
import { convertHtmlToMarkdown } from './convert';
import { sanitizeFilename, withMarkdownExtension } from './filename';
import { formatMarkdown } from './format';
import { extractImageRefs, fetchImageBundle, type ImageBundleEntry, rewriteImageRefs } from './images';
import { applyTemplate } from './template';
import type { ClipSettings, ExtractedArticle } from './types';
import { buildZipBlob, disambiguateFilename } from './zip';

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

export interface BatchClipResult {
	markdown: string;
	filename: string;
	images: ImageBundleEntry[];
}

export async function fetchAndConvert(
	url: string,
	settings: ClipSettings,
): Promise<BatchClipResult> {
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

	const body = convertHtmlToMarkdown(parsed.html, settings);
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
	let markdown = `${assembled}\n`;
	let images: ImageBundleEntry[] = [];

	if (settings.downloadImages) {
		const refs = extractImageRefs(markdown, url);
		images = await fetchImageBundle(refs);
		markdown = rewriteImageRefs(markdown, images);
	}

	const filename = withMarkdownExtension(
		sanitizeFilename(applyTemplate(settings.title, article)),
	);
	return { markdown, filename, images };
}

export function buildBatchZip(entries: BatchClipResult[]): Blob {
	const taken = new Map<string, number>();
	const zipEntries = [];
	for (const entry of entries) {
		const mdName = disambiguateFilename(taken, entry.filename);
		zipEntries.push({ path: mdName, content: entry.markdown });
		const stem = mdName.replace(/\.md$/i, '');
		for (const image of entry.images) {
			zipEntries.push({
				path: `${stem}-${image.localPath}`,
				content: image.bytes,
			});
		}
	}
	return buildZipBlob(zipEntries);
}

export function parseUrlList(input: string): string[] {
	return input
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.filter((line) => /^https?:\/\//i.test(line));
}
