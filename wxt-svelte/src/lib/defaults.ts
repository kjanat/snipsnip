import type { ClipSettings } from './types';

export const DEFAULT_SETTINGS: ClipSettings = {
	headingStyle: 'atx',
	hr: '---',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
	fence: '```',
	emDelimiter: '_',
	strongDelimiter: '**',
	linkStyle: 'inlined',
	linkReferenceStyle: 'full',
	imageStyle: 'markdown',
	imageRefStyle: 'inlined',
	frontmatter:
		'---\ntitle: "{pageTitle}"\nsource: "{baseURI}"\nauthor: "{byline}"\npublished: "{publishedTime}"\ncreated: "{date:YYYY-MM-DDTHH:mm}"\n---\n\n# {pageTitle}\n\n',
	backmatter: '',
	title: '{pageTitle}',
	includeTemplate: true,
	downloadImages: false,
	saveAs: false,
	obsidianVault: '',
	obsidianFolder: '',
};
