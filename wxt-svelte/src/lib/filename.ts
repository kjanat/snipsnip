const ILLEGAL = /[<>:"/\\|?*\x00-\x1F]/g;

export function sanitizeFilename(input: string, fallback = 'clip'): string {
	const cleaned = input.replace(ILLEGAL, '').trim().replace(/\s+/g, ' ');
	return cleaned.length > 0 ? cleaned : fallback;
}

export function withMarkdownExtension(name: string): string {
	return name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
}
