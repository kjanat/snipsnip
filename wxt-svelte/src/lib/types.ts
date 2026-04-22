export type ClipMode = 'document' | 'selection';

export interface ClipSettings {
	headingStyle: 'atx' | 'setext';
	hr: string;
	bulletListMarker: '-' | '*' | '+';
	codeBlockStyle: 'fenced' | 'indented';
	fence: '```' | '~~~';
	emDelimiter: '_' | '*';
	strongDelimiter: '__' | '**';
	linkStyle: 'inlined' | 'referenced';
	linkReferenceStyle: 'full' | 'collapsed' | 'shortcut';
	imageStyle: 'markdown' | 'noImage' | 'obsidian' | 'obsidian-nofolder';
	imageRefStyle: 'inlined' | 'referenced';
	frontmatter: string;
	backmatter: string;
	title: string;
	includeTemplate: boolean;
	downloadImages: boolean;
	saveAs: boolean;
	obsidianVault: string;
	obsidianFolder: string;
	agentBridgeEnabled: boolean;
	agentBridgeHost: string;
	notificationsEnabled: boolean;
	historyLimit: number;
	siteRules: SiteRule[];
}

export interface SiteRule {
	pattern: string;
	contentSelector: string;
	excludeSelectors: string;
}

export interface ExtractedArticle {
	title: string;
	byline: string | null;
	excerpt: string | null;
	content: string;
	textContent: string;
	siteName: string | null;
	lang: string | null;
	publishedTime: string | null;
	url: string;
	hash: string;
}

export interface ClipResult {
	markdown: string;
	frontmatter: string;
	article: ExtractedArticle;
	mode: ClipMode;
}
