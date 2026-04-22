import { marked, type Token, type Tokens } from 'marked';
import type {
	Content,
	ContentTable,
	ContentText,
	StyleDictionary,
	TableCell,
	TDocumentDefinitions,
} from 'pdfmake/interfaces';

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

function inlineWalk(token: Token): Inline {
	switch (token.type) {
		case 'text': {
			const t = token as Tokens.Text;
			return t.tokens ? toRich(t.tokens) : t.text;
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

function toRich(tokens: Token[]): ContentText {
	return { text: tokens.map(inlineWalk) };
}

function listItems(items: Tokens.ListItem[]): Content[] {
	return items.map((item) => {
		const blocks = item.tokens.map(blockWalk).filter((b): b is Content => b !== null);
		if (blocks.length === 0) return '';
		return blocks.length === 1 ? (blocks[0] ?? '') : blocks;
	});
}

function tableRow(cells: Tokens.TableCell[]): TableCell[] {
	return cells.map((cell) => toRich(cell.tokens));
}

function blockWalk(token: Token): Content | null {
	switch (token.type) {
		case 'heading': {
			const h = token as Tokens.Heading;
			const depth = Math.min(Math.max(h.depth, 1), 6);
			const rich = toRich(h.tokens);
			return { ...rich, style: `h${depth}` };
		}
		case 'paragraph':
			return toRich((token as Tokens.Paragraph).tokens);
		case 'code': {
			const c = token as Tokens.Code;
			return { text: c.text, style: 'codeblock' };
		}
		case 'blockquote': {
			const bq = token as Tokens.Blockquote;
			const inner = bq.tokens
				.map(blockWalk)
				.filter((b): b is Content => b !== null);
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
				...toRich(cell.tokens),
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
						x2: 515,
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

export function markdownToDocDefinition(
	markdown: string,
	title: string,
): TDocumentDefinitions {
	const tokens = marked.lexer(markdown);
	const body: Content[] = [{ text: title, style: 'docTitle' }];
	for (const token of tokens) {
		const content = blockWalk(token);
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

export async function generatePdfBlob(markdown: string, title: string): Promise<Blob> {
	const [{ default: pdfMake }, { default: vfsFonts }] = await Promise.all([
		import('pdfmake/build/pdfmake'),
		import('pdfmake/build/vfs_fonts'),
	]);
	pdfMake.vfs = vfsFonts.pdfMake.vfs;
	const doc = markdownToDocDefinition(markdown, title);
	return new Promise<Blob>((resolve) => {
		pdfMake.createPdf(doc).getBlob((blob: Blob) => resolve(blob));
	});
}
