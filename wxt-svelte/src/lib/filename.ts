const RESERVED = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

export function sanitizeFilename(input: string, fallback = 'clip'): string {
	const cleaned = Array.from(input)
		.filter((ch) => !RESERVED.has(ch) && ch.charCodeAt(0) >= 0x20)
		.join('')
		.trim()
		.replace(/\s+/g, ' ');
	return cleaned.length > 0 ? cleaned : fallback;
}

export function withMarkdownExtension(name: string): string {
	return name.toLowerCase().endsWith('.md') ? name : `${name}.md`;
}
