import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ClipSettings } from './types';

const BLOCK_CHILD_TAGS = new Set([
	'TABLE',
	'UL',
	'OL',
	'DL',
	'PRE',
	'BLOCKQUOTE',
	'FIGURE',
	'HR',
	'H1',
	'H2',
	'H3',
	'H4',
	'H5',
	'H6',
]);

function cellHasBlockContent(cell: Element): boolean {
	for (const descendant of Array.from(cell.querySelectorAll('*'))) {
		if (BLOCK_CHILD_TAGS.has(descendant.tagName)) return true;
	}
	if (cell.querySelectorAll('p').length > 1) return true;
	if (cell.hasAttribute('colspan') || cell.hasAttribute('rowspan')) return true;
	return false;
}

function tableHasHeaderRow(table: Element): boolean {
	if (table.querySelector(':scope > thead > tr > th')) return true;
	const firstRow = table.querySelector(':scope > tbody > tr, :scope > tr');
	if (!firstRow) return false;
	return firstRow.querySelector(':scope > th') !== null;
}

function tableNeedsHtmlFallback(table: Element, mode: 'auto' | 'always' | 'never'): boolean {
	if (mode === 'always') return true;
	if (mode === 'never') return false;
	if (!tableHasHeaderRow(table)) return true;
	for (const cell of Array.from(table.querySelectorAll('th, td'))) {
		if (cellHasBlockContent(cell)) return true;
	}
	return false;
}

function isInsideTableCell(node: Node): boolean {
	let parent = node.parentNode as Element | null;
	while (parent) {
		const tag = parent.tagName;
		if (tag === 'TD' || tag === 'TH') return true;
		if (tag === 'TABLE') return false;
		parent = parent.parentNode as Element | null;
	}
	return false;
}

function stripHtmlTable(table: Element): string {
	const html = table.outerHTML.replace(/^\s+|\s+$/g, '');
	return `\n\n${html}\n\n`;
}

const LANG_PATTERNS = [
	/highlight-source-([\w-]+)/, // GitHub / JSR
	/language-([\w-]+)/, // hljs / Prism
	/lang-([\w-]+)/, // Pandoc
];

function sniffLanguage(pre: Element): string {
	const candidates = [pre.className, pre.parentElement?.className ?? ''];
	for (const cls of candidates) {
		for (const pattern of LANG_PATTERNS) {
			const match = cls.match(pattern);
			if (match?.[1]) return match[1];
		}
	}
	return '';
}

function preWithoutCode(node: Node): boolean {
	if (node.nodeName !== 'PRE') return false;
	return (node as Element).querySelector('code') === null;
}

function preCodeBlock(
	node: Element,
	settings: Pick<ClipSettings, 'codeBlockStyle' | 'fence'>,
): string {
	const text = (node.textContent ?? '').replace(/^\n+|\n+$/g, '');
	if (text.length === 0) return '';
	if (settings.codeBlockStyle === 'indented') {
		return `\n\n${text.split('\n').map((line) => `    ${line}`).join('\n')}\n\n`;
	}
	const lang = sniffLanguage(node);
	const fence = settings.fence;
	return `\n\n${fence}${lang}\n${text}\n${fence}\n\n`;
}

export function buildTurndown(settings: ClipSettings): TurndownService {
	const service = new TurndownService({
		headingStyle: settings.headingStyle,
		hr: settings.hr,
		bulletListMarker: settings.bulletListMarker,
		codeBlockStyle: settings.codeBlockStyle,
		fence: settings.fence,
		emDelimiter: settings.emDelimiter,
		strongDelimiter: settings.strongDelimiter,
		linkStyle: settings.linkStyle,
		linkReferenceStyle: settings.linkReferenceStyle,
	});
	service.use(gfm);

	service.addRule('br-in-table-cell', {
		filter: (node) => node.nodeName === 'BR' && isInsideTableCell(node),
		replacement: () => '<br>',
	});

	service.addRule('complex-table-html-fallback', {
		filter: (node) =>
			node.nodeName === 'TABLE'
			&& tableNeedsHtmlFallback(node, settings.htmlTableFallback),
		replacement: (_content, node) => stripHtmlTable(node as Element),
	});

	service.addRule('pre-without-code', {
		filter: preWithoutCode,
		replacement: (_content, node) => preCodeBlock(node as Element, settings),
	});

	service.addRule('unwrap-block-in-cell', {
		filter: (node) =>
			(node.nodeName === 'DIV' || node.nodeName === 'P')
			&& isInsideTableCell(node),
		replacement: (content) => content.trim(),
	});

	if (settings.imageStyle === 'noImage') {
		service.addRule('drop-images', {
			filter: 'img',
			replacement: () => '',
		});
	} else if (
		settings.imageStyle === 'obsidian'
		|| settings.imageStyle === 'obsidian-nofolder'
	) {
		service.addRule('obsidian-images', {
			filter: 'img',
			replacement: (_content, node) => {
				const img = node as HTMLImageElement;
				const src = img.getAttribute('src') ?? '';
				return src ? `![[${src}]]` : '';
			},
		});
	}

	return service;
}

const SHARE_LINK_RE = /^\[(?:Delen|Share|Teilen|Partager|Condividi|Compartir|Compartilhar)\]\([^)]*\)$/gm;

const NAMED_ENTITIES: Record<string, string> = {
	'&nbsp;': ' ',
	'&ensp;': ' ',
	'&emsp;': ' ',
	'&thinsp;': ' ',
	'&amp;': '&',
	'&quot;': '"',
	'&apos;': "'",
	'&ndash;': '–',
	'&mdash;': '—',
	'&lsquo;': '‘',
	'&rsquo;': '’',
	'&ldquo;': '“',
	'&rdquo;': '”',
	'&hellip;': '…',
	'&bull;': '•',
	'&middot;': '·',
	'&trade;': '™',
	'&copy;': '©',
	'&reg;': '®',
	'&deg;': '°',
	'&plusmn;': '±',
	'&times;': '×',
	'&divide;': '÷',
	'&frac14;': '¼',
	'&frac12;': '½',
	'&frac34;': '¾',
	'&laquo;': '«',
	'&raquo;': '»',
	'&euro;': '€',
	'&pound;': '£',
	'&yen;': '¥',
	'&cent;': '¢',
	'&sect;': '§',
	'&micro;': 'µ',
	'&para;': '¶',
	'&iexcl;': '¡',
	'&iquest;': '¿',
};

const NAMED_ENTITY_RE = new RegExp(
	Object.keys(NAMED_ENTITIES).map((k) => k.replace(/[&;]/g, '\\$&')).join('|'),
	'gi',
);

function decodeEntitiesInSegment(text: string): string {
	let result = text.replace(NAMED_ENTITY_RE, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? m);
	result = result.replace(/&#(\d+);/g, (raw, n) => {
		const cp = Number(n);
		return cp === 60 || cp === 62 ? raw : String.fromCodePoint(cp);
	});
	result = result.replace(/&#x([0-9a-f]+);/gi, (raw, h) => {
		const cp = parseInt(h, 16);
		return cp === 0x3c || cp === 0x3e ? raw : String.fromCodePoint(cp);
	});
	return result.replaceAll(' ', ' ');
}

const CODE_REGION_RE = /^`{3,}[^\n]*\n[\s\S]*?^`{3,}$|^~{3,}[^\n]*\n[\s\S]*?^~{3,}$|`[^`\n]+`/gm;

function decodeEntitiesOutsideCode(markdown: string): string {
	let result = '';
	let lastIndex = 0;
	for (const match of markdown.matchAll(CODE_REGION_RE)) {
		const idx = match.index;
		result += decodeEntitiesInSegment(markdown.slice(lastIndex, idx));
		result += match[0];
		lastIndex = idx + match[0].length;
	}
	result += decodeEntitiesInSegment(markdown.slice(lastIndex));
	return result;
}

function postProcess(markdown: string, settings: ClipSettings): string {
	let result = markdown.replace(SHARE_LINK_RE, '');
	if (settings.decodeEntities) {
		result = decodeEntitiesOutsideCode(result);
	}
	return result.replace(/\n{3,}/g, '\n\n');
}

export function convertHtmlToMarkdown(html: string, settings: ClipSettings): string {
	const turndown = buildTurndown(settings);
	return postProcess(turndown.turndown(html), settings);
}
