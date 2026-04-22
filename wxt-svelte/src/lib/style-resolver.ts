export interface StyleHints {
	italic: boolean;
	bold: boolean;
	strike: boolean;
	mono: boolean;
}

const SEMANTIC_TAGS = new Set([
	'EM',
	'STRONG',
	'B',
	'I',
	'CODE',
	'DEL',
	'S',
	'STRIKE',
	'PRE',
	'KBD',
	'SAMP',
	'VAR',
	'INS',
	'MARK',
	'SUB',
	'SUP',
]);

const SKIP_TAGS = new Set([
	'SCRIPT',
	'STYLE',
	'NOSCRIPT',
	'IFRAME',
	'SVG',
	'CANVAS',
	'VIDEO',
	'AUDIO',
	'OBJECT',
	'EMBED',
	'TEMPLATE',
	'HEAD',
]);

const HEADING_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

const MONO_FAMILY =
	/(?:^|,)\s*"?(?:monospace|consolas|menlo|monaco|courier|"fira code"|"jetbrains mono"|"sf mono"|"source code pro"|"ubuntu mono"|"cascadia code"|"liberation mono")/i;

const EMPTY_HINTS: StyleHints = { italic: false, bold: false, strike: false, mono: false };

function readHints(el: Element, view: Window): StyleHints {
	const cs = view.getComputedStyle(el);
	const weight = Number.parseInt(cs.fontWeight, 10);
	const textDecoration = `${cs.textDecorationLine ?? ''} ${cs.textDecoration ?? ''}`;
	return {
		italic: cs.fontStyle === 'italic' || cs.fontStyle === 'oblique',
		bold: Number.isFinite(weight) && weight >= 600,
		strike: textDecoration.includes('line-through'),
		mono: MONO_FAMILY.test(cs.fontFamily),
	};
}

function shouldVisit(el: Element): boolean {
	if (SKIP_TAGS.has(el.tagName)) return false;
	if (HEADING_TAGS.has(el.tagName)) return false;
	if (SEMANTIC_TAGS.has(el.tagName)) return false;
	const text = el.textContent ?? '';
	return text.trim().length > 0;
}

function elementsInOrder(root: Element): Element[] {
	const out: Element[] = [];
	const stack: Element[] = [root];
	while (stack.length > 0) {
		const node = stack.pop();
		if (!node) continue;
		out.push(node);
		const children = node.children;
		for (let i = children.length - 1; i >= 0; i -= 1) {
			const child = children.item(i);
			if (child) stack.push(child);
		}
	}
	return out;
}

export function snapshotStyleHints(root: Element, view: Window): StyleHints[] {
	return elementsInOrder(root).map((el) => (shouldVisit(el) ? readHints(el, view) : EMPTY_HINTS));
}

function deltaHints(own: StyleHints, parent: StyleHints): StyleHints {
	return {
		italic: own.italic && !parent.italic,
		bold: own.bold && !parent.bold,
		strike: own.strike && !parent.strike,
		mono: own.mono && !parent.mono,
	};
}

function wrapChildren(el: Element, tag: string, ownerDoc: Document): void {
	const wrapper = ownerDoc.createElement(tag);
	while (el.firstChild) wrapper.appendChild(el.firstChild);
	el.appendChild(wrapper);
}

export function applyStyleHints(root: Element, hints: StyleHints[]): void {
	const ordered = elementsInOrder(root);
	const ownerDoc = root.ownerDocument;
	if (!ownerDoc) return;
	const hintByElement = new Map<Element, StyleHints>();
	const originalParent = new Map<Element, Element | null>();
	for (let i = 0; i < ordered.length; i += 1) {
		const el = ordered[i];
		const hint = hints[i];
		if (!el) continue;
		if (hint) hintByElement.set(el, hint);
		originalParent.set(el, el.parentElement);
	}

	for (const el of ordered) {
		if (!shouldVisit(el)) continue;
		const own = hintByElement.get(el) ?? EMPTY_HINTS;
		const parent = originalParent.get(el) ?? null;
		const parentHint = parent ? (hintByElement.get(parent) ?? EMPTY_HINTS) : EMPTY_HINTS;
		const delta = deltaHints(own, parentHint);
		if (!delta.italic && !delta.bold && !delta.strike && !delta.mono) continue;
		if (delta.mono) wrapChildren(el, 'code', ownerDoc);
		if (delta.strike) wrapChildren(el, 'del', ownerDoc);
		if (delta.bold) wrapChildren(el, 'strong', ownerDoc);
		if (delta.italic) wrapChildren(el, 'em', ownerDoc);
	}
}

export function resolveStylesOnLive(
	live: Element,
	clone: Element,
	view: Window | null = globalThis.window ?? null,
): void {
	if (!view) return;
	const hints = snapshotStyleHints(live, view);
	applyStyleHints(clone, hints);
}
