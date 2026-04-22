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
	if (cell.querySelectorAll('br').length > 0) return true;
	if (cell.hasAttribute('colspan') || cell.hasAttribute('rowspan')) return true;
	return false;
}

function tableNeedsHtmlFallback(table: Element): boolean {
	for (const cell of Array.from(table.querySelectorAll('th, td'))) {
		if (cellHasBlockContent(cell)) return true;
	}
	return false;
}

function stripHtmlTable(table: Element): string {
	const html = table.outerHTML.replace(/^\s+|\s+$/g, '');
	return `\n\n${html}\n\n`;
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

	service.addRule('complex-table-html-fallback', {
		filter: (node) => node.nodeName === 'TABLE' && tableNeedsHtmlFallback(node),
		replacement: (_content, node) => stripHtmlTable(node as Element),
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

export function convertHtmlToMarkdown(html: string, settings: ClipSettings): string {
	const turndown = buildTurndown(settings);
	return turndown.turndown(html);
}
