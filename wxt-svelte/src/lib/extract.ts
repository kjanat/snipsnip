import { Readability } from '@mozilla/readability';
import { applyRule, findMatchingRule } from './site-rules';
import type { ClipMode, ExtractedArticle, SiteRule } from './types';

interface ReadabilityArticle {
	title: string | null;
	byline: string | null;
	dir: string | null;
	lang: string | null;
	content: string | null;
	textContent: string | null;
	length: number;
	excerpt: string | null;
	siteName: string | null;
	publishedTime: string | null;
}

const META_KEYS = [
	'article:published_time',
	'article:modified_time',
	'date',
	'pubdate',
	'publishdate',
	'datePublished',
] as const;

function readPublishedTime(doc: Document): string | null {
	for (const key of META_KEYS) {
		const meta = doc.querySelector(
			`meta[property="${key}"], meta[name="${key}"]`,
		);
		const value = meta?.getAttribute('content')?.trim();
		if (value) return value;
	}
	const time = doc.querySelector('time[datetime]');
	return time?.getAttribute('datetime')?.trim() ?? null;
}

function selectionAsHtml(selection: Selection): string {
	const container = document.createElement('div');
	for (let i = 0; i < selection.rangeCount; i += 1) {
		container.appendChild(selection.getRangeAt(i).cloneContents());
	}
	return container.innerHTML;
}

async function digest(input: string): Promise<string> {
	const buffer = new TextEncoder().encode(input);
	const hashed = await crypto.subtle.digest('SHA-1', buffer);
	return Array.from(new Uint8Array(hashed))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 12);
}

export async function extractArticle(
	mode: ClipMode,
	siteRules: SiteRule[] = [],
): Promise<ExtractedArticle> {
	const url = location.href;
	const fallbackTitle = document.title;
	let html: string;
	let parsed: ReadabilityArticle | null = null;

	if (mode === 'selection') {
		const selection = window.getSelection();
		if (!selection || selection.isCollapsed) {
			throw new Error('No text selected on this page.');
		}
		html = selectionAsHtml(selection);
	} else {
		const cloned = document.cloneNode(true) as Document;
		const matched = findMatchingRule(siteRules, location.hostname);
		const prepared = matched ? applyRule(cloned, matched) : cloned;
		parsed = new Readability(prepared).parse() as ReadabilityArticle | null;
		html = parsed?.content ?? prepared.body.innerHTML;
	}

	const hash = await digest(`${url}::${html}`);
	return {
		title: parsed?.title?.trim() || fallbackTitle,
		byline: parsed?.byline ?? null,
		excerpt: parsed?.excerpt ?? null,
		content: html,
		textContent: parsed?.textContent ?? '',
		siteName: parsed?.siteName ?? null,
		lang: parsed?.lang ?? document.documentElement.lang ?? null,
		publishedTime: readPublishedTime(document),
		url,
		hash,
	};
}
