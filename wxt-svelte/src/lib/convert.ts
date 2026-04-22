import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ClipSettings } from './types';

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
