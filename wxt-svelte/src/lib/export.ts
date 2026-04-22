import { marked, type Token, type Tokens } from 'marked';
import { generatePdfBlob } from './pdf';

export type ExportFormat = 'md' | 'html' | 'txt' | 'pdf';

const STYLE =
	'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1a1a1a}pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto}code{background:#f6f8fa;padding:1px 4px;border-radius:3px}img{max-width:100%}blockquote{border-left:4px solid #d1d5db;padding-left:12px;color:#4b5563;margin-left:0}table{border-collapse:collapse}th,td{border:1px solid #d1d5db;padding:6px 10px}';

function escapeHtml(value: string): string {
	const el = document.createElement('div');
	el.textContent = value;
	return el.innerHTML;
}

export function toHtmlDocument(markdown: string, title: string): string {
	const body = marked.parse(markdown, { async: false }) as string;
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function inlineText(tokens: Token[] | undefined): string {
	if (!tokens) return '';
	return tokens.map(walkInline).join('');
}

function walkInline(token: Token): string {
	switch (token.type) {
		case 'text': {
			const t = token as Tokens.Text;
			return t.tokens ? inlineText(t.tokens) : t.text;
		}
		case 'escape':
			return (token as Tokens.Escape).text;
		case 'link':
			return inlineText((token as Tokens.Link).tokens);
		case 'image':
			return (token as Tokens.Image).text;
		case 'strong':
			return inlineText((token as Tokens.Strong).tokens);
		case 'em':
			return inlineText((token as Tokens.Em).tokens);
		case 'codespan':
			return (token as Tokens.Codespan).text;
		case 'br':
			return '\n';
		case 'del':
			return inlineText((token as Tokens.Del).tokens);
		case 'html':
			return '';
		default:
			return 'raw' in token ? String(token.raw) : '';
	}
}

function walkBlock(token: Token): string {
	switch (token.type) {
		case 'heading':
			return inlineText((token as Tokens.Heading).tokens);
		case 'paragraph':
			return inlineText((token as Tokens.Paragraph).tokens);
		case 'code':
			return (token as Tokens.Code).text;
		case 'blockquote':
			return (token as Tokens.Blockquote).tokens.map(walkBlock).join('\n');
		case 'list': {
			const list = token as Tokens.List;
			return list.items
				.map((item) => item.tokens.map(walkBlock).join('\n'))
				.join('\n');
		}
		case 'table': {
			const table = token as Tokens.Table;
			const header = table.header.map((c) => inlineText(c.tokens)).join('\t');
			const rows = table.rows
				.map((row) => row.map((c) => inlineText(c.tokens)).join('\t'))
				.join('\n');
			return `${header}\n${rows}`;
		}
		case 'hr':
			return '';
		case 'space':
			return '';
		case 'html':
			return '';
		default:
			return 'raw' in token ? String(token.raw) : '';
	}
}

export function toPlainText(markdown: string): string {
	const tokens = marked.lexer(markdown);
	return tokens
		.map(walkBlock)
		.filter((chunk) => chunk.length > 0)
		.join('\n\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

interface ExportPayload {
	content: string | Blob | Promise<Blob>;
	mime: string;
	ext: string;
}

export function exportPayload(
	markdown: string,
	title: string,
	format: ExportFormat,
): ExportPayload {
	switch (format) {
		case 'md':
			return { content: markdown, mime: 'text/markdown', ext: 'md' };
		case 'html':
			return { content: toHtmlDocument(markdown, title), mime: 'text/html', ext: 'html' };
		case 'txt':
			return { content: toPlainText(markdown), mime: 'text/plain', ext: 'txt' };
		case 'pdf':
			return { content: generatePdfBlob(markdown, title), mime: 'application/pdf', ext: 'pdf' };
	}
}
