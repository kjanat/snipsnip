import { marked, type Token, type Tokens } from 'marked';
import type {
	Content,
	ContentImage,
	ContentSvg,
	ContentTable,
	ContentText,
	StyleDictionary,
	TableCell,
	TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { bytesToDataUri, bytesToText, extractImageRefs, fetchImageBundle, type ImageBundleEntry } from './images';

export type EmbeddedImage =
	| { kind: 'raster'; dataUri: string }
	| { kind: 'svg'; markup: string };

const PAGE_CONTENT_WIDTH = 515;
const PAGE_IMAGE_HEIGHT = 700;

const SVG_MIME = /^image\/svg\+xml/i;
const RASTER_MIMES = /^image\/(png|jpeg|jpg)$/i;

export function bundleToEmbeds(bundle: ImageBundleEntry[]): Map<string, EmbeddedImage> {
	const map = new Map<string, EmbeddedImage>();
	for (const entry of bundle) {
		if (SVG_MIME.test(entry.mime)) {
			const embed: EmbeddedImage = { kind: 'svg', markup: bytesToText(entry.bytes) };
			map.set(entry.original, embed);
			map.set(entry.resolved, embed);
		} else if (RASTER_MIMES.test(entry.mime)) {
			const embed: EmbeddedImage = {
				kind: 'raster',
				dataUri: bytesToDataUri(entry.bytes, entry.mime),
			};
			map.set(entry.original, embed);
			map.set(entry.resolved, embed);
		}
	}
	return map;
}

const STYLES: StyleDictionary = {
	h1: { fontSize: 24, bold: true, margin: [0, 18, 0, 8] },
	h2: { fontSize: 20, bold: true, margin: [0, 16, 0, 6] },
	h3: { fontSize: 17, bold: true, margin: [0, 14, 0, 6] },
	h4: { fontSize: 14, bold: true, margin: [0, 12, 0, 4] },
	h5: { fontSize: 13, bold: true, margin: [0, 10, 0, 4] },
	h6: { fontSize: 12, bold: true, italics: true, margin: [0, 10, 0, 4] },
	codeblock: {
		font: 'Courier',
		fontSize: 10,
		preserveLeadingSpaces: true,
		margin: [0, 6, 0, 6],
		color: '#1f2937',
	},
	codespan: { font: 'Courier', fontSize: 10, color: '#b91c1c' },
	blockquote: { italics: true, color: '#6b7280', margin: [12, 6, 0, 6] },
	tableHeader: { bold: true, fillColor: '#f3f4f6' },
	link: { color: '#2563eb', decoration: 'underline' },
	docTitle: { fontSize: 28, bold: true, margin: [0, 0, 0, 16] },
	imageCaption: { fontSize: 9, italics: true, color: '#6b7280', alignment: 'center' },
};

function plainText(token: Token): string {
	switch (token.type) {
		case 'text': {
			const t = token as Tokens.Text;
			return t.tokens ? t.tokens.map(plainText).join('') : t.text;
		}
		case 'escape':
			return (token as Tokens.Escape).text;
		case 'strong':
		case 'em':
		case 'del':
		case 'link': {
			const parent = token as Tokens.Strong | Tokens.Em | Tokens.Del | Tokens.Link;
			return parent.tokens.map(plainText).join('');
		}
		case 'codespan':
			return (token as Tokens.Codespan).text;
		case 'image': {
			const img = token as Tokens.Image;
			return img.text || img.title || '[image]';
		}
		case 'br':
			return '\n';
		case 'html':
			return '';
		default:
			return 'raw' in token ? String(token.raw) : '';
	}
}

type Inline = string | ContentText;

function embedToBlock(embed: EmbeddedImage, alt: string): Content {
	const caption: Content[] = alt ? [{ text: alt, style: 'imageCaption' }] : [];
	if (embed.kind === 'svg') {
		const svg: ContentSvg = {
			svg: embed.markup,
			fit: [PAGE_CONTENT_WIDTH, PAGE_IMAGE_HEIGHT],
		};
		return { stack: [svg, ...caption], margin: [0, 6, 0, 6] };
	}
	const image: ContentImage = {
		image: embed.dataUri,
		fit: [PAGE_CONTENT_WIDTH, PAGE_IMAGE_HEIGHT],
	};
	return { stack: [image, ...caption], margin: [0, 6, 0, 6] };
}

interface Walker {
	block: (token: Token) => Content | null;
	rich: (tokens: Token[]) => ContentText;
}

function makeWalker(embeds: Map<string, EmbeddedImage>): Walker {
	function inlineImageEmbed(img: Tokens.Image): EmbeddedImage | null {
		return embeds.get(img.href) ?? null;
	}

	function inlineWalk(token: Token): Inline {
		switch (token.type) {
			case 'text': {
				const t = token as Tokens.Text;
				return t.tokens ? rich(t.tokens) : t.text;
			}
			case 'escape':
				return (token as Tokens.Escape).text;
			case 'strong':
				return { text: plainText(token), bold: true };
			case 'em':
				return { text: plainText(token), italics: true };
			case 'codespan':
				return { text: (token as Tokens.Codespan).text, style: 'codespan' };
			case 'del':
				return { text: plainText(token), decoration: 'lineThrough' };
			case 'link': {
				const link = token as Tokens.Link;
				return { text: plainText(link), link: link.href, style: 'link' };
			}
			case 'image': {
				const img = token as Tokens.Image;
				return { text: img.text || img.title || '[image]', italics: true };
			}
			case 'br':
				return '\n';
			case 'html':
				return '';
			default:
				return 'raw' in token ? String(token.raw) : '';
		}
	}

	function rich(tokens: Token[]): ContentText {
		return { text: tokens.map(inlineWalk) };
	}

	function paragraphContent(tokens: Token[]): Content {
		const out: Content[] = [];
		let buf: Inline[] = [];
		const flush = () => {
			if (buf.length === 0) return;
			out.push({ text: buf });
			buf = [];
		};
		for (const token of tokens) {
			if (token.type === 'image') {
				const img = token as Tokens.Image;
				const embed = inlineImageEmbed(img);
				if (embed) {
					flush();
					out.push(embedToBlock(embed, img.text));
					continue;
				}
			}
			buf.push(inlineWalk(token));
		}
		flush();
		if (out.length === 0) return { text: '' };
		if (out.length === 1) return out[0] ?? '';
		return { stack: out };
	}

	function listItems(items: Tokens.ListItem[]): Content[] {
		return items.map((item) => {
			const blocks = item.tokens.map(block).filter((b): b is Content => b !== null);
			if (blocks.length === 0) return '';
			return blocks.length === 1 ? (blocks[0] ?? '') : blocks;
		});
	}

	function tableRow(cells: Tokens.TableCell[]): TableCell[] {
		return cells.map((cell) => rich(cell.tokens));
	}

	function block(token: Token): Content | null {
		switch (token.type) {
			case 'heading': {
				const h = token as Tokens.Heading;
				const depth = Math.min(Math.max(h.depth, 1), 6);
				return { ...rich(h.tokens), style: `h${depth}` };
			}
			case 'paragraph':
				return paragraphContent((token as Tokens.Paragraph).tokens);
			case 'code': {
				const c = token as Tokens.Code;
				return { text: c.text, style: 'codeblock' };
			}
			case 'blockquote': {
				const bq = token as Tokens.Blockquote;
				const inner = bq.tokens.map(block).filter((b): b is Content => b !== null);
				return { stack: inner, style: 'blockquote' };
			}
			case 'list': {
				const list = token as Tokens.List;
				const items = listItems(list.items);
				return list.ordered ? { ol: items } : { ul: items };
			}
			case 'table': {
				const table = token as Tokens.Table;
				const headerCells: TableCell[] = table.header.map((cell) => ({
					...rich(cell.tokens),
					style: 'tableHeader',
				}));
				const body: TableCell[][] = [headerCells, ...table.rows.map(tableRow)];
				const widths: ContentTable['table']['widths'] = headerCells.map(() => 'auto');
				return {
					table: { headerRows: 1, body, widths },
					margin: [0, 6, 0, 6],
				};
			}
			case 'hr':
				return {
					canvas: [
						{
							type: 'line',
							x1: 0,
							y1: 4,
							x2: PAGE_CONTENT_WIDTH,
							y2: 4,
							lineWidth: 0.5,
							lineColor: '#d1d5db',
						},
					],
				};
			case 'space':
			case 'html':
				return null;
			default:
				return 'raw' in token ? String(token.raw) : null;
		}
	}

	return { block, rich };
}

export interface DocDefinitionOptions {
	embeds?: Map<string, EmbeddedImage>;
}

export function markdownToDocDefinition(
	markdown: string,
	title: string,
	options: DocDefinitionOptions = {},
): TDocumentDefinitions {
	const walker = makeWalker(options.embeds ?? new Map());
	const tokens = marked.lexer(markdown);
	const body: Content[] = [{ text: title, style: 'docTitle' }];
	for (const token of tokens) {
		const content = walker.block(token);
		if (content !== null) body.push(content);
	}
	return {
		info: { title, creator: 'SnipSnip', producer: 'SnipSnip' },
		content: body,
		styles: STYLES,
		defaultStyle: { fontSize: 11, lineHeight: 1.4 },
		pageSize: 'A4',
		pageMargins: [40, 48, 40, 48],
	};
}

export interface GeneratePdfOptions {
	embedImages?: boolean;
	baseUrl?: string | null;
}

export async function generatePdfBlob(
	markdown: string,
	title: string,
	options: GeneratePdfOptions = {},
): Promise<Blob> {
	let embeds: Map<string, EmbeddedImage> | undefined;
	if (options.embedImages) {
		const refs = extractImageRefs(markdown, options.baseUrl ?? null);
		const bundle = await fetchImageBundle(refs);
		embeds = bundleToEmbeds(bundle);
	}

	const [{ default: pdfMake }, { default: vfsFonts }] = await Promise.all([
		import('pdfmake/build/pdfmake'),
		import('pdfmake/build/vfs_fonts'),
	]);
	pdfMake.vfs = vfsFonts.pdfMake.vfs;
	const doc = markdownToDocDefinition(markdown, title, embeds ? { embeds } : {});
	return new Promise<Blob>((resolve) => {
		pdfMake.createPdf(doc).getBlob((blob: Blob) => resolve(blob));
	});
}
