import { Readability } from '@mozilla/readability';
import { applyRule, findMatchingRule } from './site-rules';
import { resolveStylesOnLive } from './style-resolver';
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

function frameElements(doc: Document): Element[] {
	const elements = doc.getElementsByTagName('*');
	const frames: Element[] = [];
	for (const element of Array.from(elements)) {
		const name = element.localName?.toLowerCase();
		if ((name === 'frame' || name === 'iframe') && element.getAttribute('src')) {
			frames.push(element);
		}
	}
	return frames;
}

function isFramesetDocument(doc: Document): boolean {
	const body = doc.body;
	if (body && body.localName?.toLowerCase() === 'frameset') return true;
	if (doc.getElementsByTagName('frameset').length > 0) return true;
	if (!body && doc.getElementsByTagName('frame').length > 0) return true;
	return false;
}

function synthesizeFramesetBody(doc: Document, baseHref: string): HTMLElement | null {
	const frames = frameElements(doc);
	if (frames.length === 0) return null;

	const body = doc.createElement('body');
	const heading = doc.createElement('h1');
	heading.textContent = doc.title || 'Frameset document';
	body.appendChild(heading);

	const list = doc.createElement('ul');
	for (const frame of frames) {
		const src = frame.getAttribute('src') ?? '';
		if (!src) continue;
		let href = src;
		try {
			href = new URL(src, baseHref).href;
		} catch {
			// Keep the raw src if it cannot be resolved against the base URL.
		}
		const label = frame.getAttribute('title')
			|| frame.getAttribute('name')
			|| frame.getAttribute('id')
			|| src;
		const item = doc.createElement('li');
		const link = doc.createElement('a');
		link.setAttribute('href', href);
		link.textContent = label;
		item.appendChild(link);
		list.appendChild(item);
	}
	body.appendChild(list);
	return body;
}

function flattenFramesetIntoBody(doc: Document, baseHref: string): HTMLElement | null {
	const synthetic = synthesizeFramesetBody(doc, baseHref);
	if (!synthetic) return null;
	const existingBody = doc.body;
	if (existingBody) {
		existingBody.replaceWith(synthetic);
	} else {
		doc.documentElement.appendChild(synthetic);
	}
	for (const frameset of Array.from(doc.getElementsByTagName('frameset'))) {
		frameset.remove();
	}
	return synthetic;
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
	options: { resolveStyles?: boolean } = {},
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
		const wasFrameset = isFramesetDocument(prepared);
		if (wasFrameset) {
			flattenFramesetIntoBody(prepared, url);
		}
		if (options.resolveStyles && !wasFrameset && document.body && prepared.body) {
			resolveStylesOnLive(document.body, prepared.body, window);
		}
		parsed = wasFrameset
			? null
			: (new Readability(prepared).parse() as ReadabilityArticle | null);
		html = parsed?.content ?? prepared.body?.innerHTML ?? '';
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
