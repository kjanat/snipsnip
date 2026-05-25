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

/** Walk every element under `doc` and return the `<frame>`/`<iframe>` nodes that have a `src`. */
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

/**
 * Detect HTML 4 / XHTML 1.0 frameset documents that Readability cannot parse.
 *
 * Per HTML spec, `document.body` returns the first `<body>` *or* `<frameset>`
 * child of `<html>`, so a frameset page can show up either as a frameset-typed
 * body or, when the parser has dropped a stray `<body>`, as a body-less doc
 * with one or more `<frame>` elements at the root.
 */
function isFramesetDocument(doc: Document): boolean {
	const body = doc.body;
	if (body && body.localName?.toLowerCase() === 'frameset') return true;
	if (doc.getElementsByTagName('frameset').length > 0) return true;
	if (!body && doc.getElementsByTagName('frame').length > 0) return true;
	return false;
}

/**
 * Build a synthetic `<body>` listing each frame as a link.
 *
 * Used as the last-resort representation when the live frame documents are
 * unreachable (cross-origin, not yet loaded) — at least the reader sees where
 * the content lives instead of an empty clip.
 */
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

/** Replace any `<frameset>` in `doc` with the synthetic link-list body so Readability has something to work on. */
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

/** Pick a human-readable label for a frame, preferring `title`/`name`/`id`/`src` in that order. */
function frameLabel(frame: Element, index: number): string {
	return (
		frame.getAttribute('title')
		|| frame.getAttribute('name')
		|| frame.getAttribute('id')
		|| frame.getAttribute('src')
		|| `Frame ${index + 1}`
	);
}

type FrameElement = HTMLFrameElement | HTMLIFrameElement;

/** Read `frame.contentWindow` while swallowing the `SecurityError` cross-origin frames throw. */
function safeContentWindow(frame: Element): Window | null {
	try {
		return (frame as FrameElement).contentWindow ?? null;
	} catch {
		return null;
	}
}

/** Read `frame.contentDocument` while swallowing the `SecurityError` cross-origin frames throw. */
function safeContentDocument(frame: Element): Document | null {
	try {
		return (frame as FrameElement).contentDocument ?? null;
	} catch {
		return null;
	}
}

/** Read `win.document` safely — cross-origin windows throw on document access. */
function safeOwnDocument(win: Window | null): Document | null {
	if (!win) return null;
	try {
		return win.document ?? null;
	} catch {
		return null;
	}
}

/** True when a `<body>` element is actually a frameset (per HTML's body/frameset duality). */
function isFramesetBody(body: HTMLElement | null): boolean {
	return !!body && body.localName?.toLowerCase() === 'frameset';
}

/** Append a paragraph linking to the frame's `src`, used when the frame's body cannot be inlined. Returns true if a link was added. */
function appendFrameLinkFallback(
	section: HTMLElement,
	frame: Element,
	label: string,
	baseHref: string,
	targetDoc: Document,
): boolean {
	const src = frame.getAttribute('src') ?? '';
	if (!src) return false;
	let href = src;
	try {
		href = new URL(src, baseHref).href;
	} catch {
		// Keep the raw src when resolution fails (e.g. about:blank frames).
	}
	const paragraph = targetDoc.createElement('p');
	const link = targetDoc.createElement('a');
	link.setAttribute('href', href);
	link.textContent = label;
	paragraph.appendChild(link);
	section.appendChild(paragraph);
	return true;
}

/**
 * Walk every frame reachable from `sourceDoc`, importing each same-origin body
 * into `targetParent` as a `<section>` headed by the frame label.
 *
 * Recurses through nested framesets and iframes. Cross-origin or empty frames
 * degrade to a single link via {@link appendFrameLinkFallback}. The `visited`
 * set guards against same-document cycles. Returns the number of sections
 * appended so callers can detect when nothing was inlined.
 */
function inlineLiveFramesInto(
	targetParent: HTMLElement,
	sourceDoc: Document,
	targetDoc: Document,
	depth: number,
	baseHref: string,
	visited: Set<Document>,
): number {
	if (visited.has(sourceDoc)) return 0;
	visited.add(sourceDoc);

	let inlined = 0;
	let frames: Element[];
	try {
		frames = Array.from(sourceDoc.querySelectorAll('frame, iframe'));
	} catch {
		return inlined;
	}
	let index = 0;
	for (const frame of frames) {
		const label = frameLabel(frame, index);
		index += 1;
		const section = targetDoc.createElement('section');
		const heading = targetDoc.createElement(`h${Math.min(depth + 1, 6)}`);
		heading.textContent = label;
		section.appendChild(heading);

		const childDoc = safeContentDocument(frame);
		const childWin = safeContentWindow(frame);
		const effectiveDoc = childDoc ?? safeOwnDocument(childWin);

		let sectionHasContent = false;
		if (effectiveDoc) {
			const childBody = effectiveDoc.body;
			if (childBody && !isFramesetBody(childBody) && childBody.children.length > 0) {
				const imported = targetDoc.importNode(childBody, true) as HTMLElement;
				while (imported.firstChild) {
					section.appendChild(imported.firstChild);
				}
				sectionHasContent = true;
			}
			const nestedBase = effectiveDoc.baseURI || baseHref;
			const nestedCount = inlineLiveFramesInto(
				section,
				effectiveDoc,
				targetDoc,
				depth + 1,
				nestedBase,
				visited,
			);
			if (nestedCount > 0) sectionHasContent = true;
		}

		if (!sectionHasContent) {
			sectionHasContent = appendFrameLinkFallback(section, frame, label, baseHref, targetDoc);
		}

		if (sectionHasContent) {
			targetParent.appendChild(section);
			inlined += 1;
		}
	}
	return inlined;
}

/**
 * Replace `prepared`'s frameset with a synthetic body whose sections contain
 * the inlined contents of every reachable frame in `liveDoc`.
 *
 * Returns true when at least one frame was inlined; false signals the caller
 * to fall back to the link-list representation.
 */
function inlineFramesetContents(
	prepared: Document,
	liveDoc: Document,
	url: string,
): boolean {
	const synthetic = prepared.createElement('body');
	const heading = prepared.createElement('h1');
	heading.textContent = prepared.title || liveDoc.title || 'Frameset document';
	synthetic.appendChild(heading);

	const visited = new Set<Document>();
	const inlined = inlineLiveFramesInto(synthetic, liveDoc, prepared, 1, url, visited);

	const existingBody = prepared.body;
	if (existingBody) {
		existingBody.replaceWith(synthetic);
	} else {
		prepared.documentElement.appendChild(synthetic);
	}
	for (const frameset of Array.from(prepared.getElementsByTagName('frameset'))) {
		frameset.remove();
	}
	return inlined > 0;
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
			const inlined = inlineFramesetContents(prepared, document, url);
			if (!inlined) {
				flattenFramesetIntoBody(prepared, url);
			}
		}
		if (options.resolveStyles && !wasFrameset && document.body && prepared.body) {
			resolveStylesOnLive(document.body, prepared.body, window);
		}
		parsed = new Readability(prepared).parse() as ReadabilityArticle | null;
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
