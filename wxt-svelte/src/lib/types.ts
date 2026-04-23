import * as v from 'valibot';

export type ClipMode = 'document' | 'selection';

const DEFAULT_FRONTMATTER =
	'---\ntitle: "{pageTitle}"\nsource: "{baseURI}"\nauthor: "{byline}"\npublished: "{publishedTime}"\ncreated: "{date:YYYY-MM-DDTHH:mm}"\n---\n\n# {pageTitle}\n\n';

export const SiteRuleSchema = v.object({
	pattern: v.optional(v.string(), ''),
	contentSelector: v.optional(v.string(), ''),
	excludeSelectors: v.optional(v.string(), ''),
});

export const ClipSettingsSchema = v.object({
	headingStyle: v.optional(v.picklist(['atx', 'setext']), 'atx'),
	hr: v.optional(v.string(), '---'),
	bulletListMarker: v.optional(v.picklist(['-', '*', '+']), '-'),
	codeBlockStyle: v.optional(v.picklist(['fenced', 'indented']), 'fenced'),
	fence: v.optional(v.picklist(['```', '~~~']), '```'),
	emDelimiter: v.optional(v.picklist(['_', '*']), '_'),
	strongDelimiter: v.optional(v.picklist(['__', '**']), '**'),
	linkStyle: v.optional(v.picklist(['inlined', 'referenced']), 'inlined'),
	linkReferenceStyle: v.optional(v.picklist(['full', 'collapsed', 'shortcut']), 'full'),
	imageStyle: v.optional(
		v.picklist(['markdown', 'noImage', 'obsidian', 'obsidian-nofolder']),
		'markdown',
	),
	imageRefStyle: v.optional(v.picklist(['inlined', 'referenced']), 'inlined'),
	frontmatter: v.optional(v.string(), DEFAULT_FRONTMATTER),
	backmatter: v.optional(v.string(), ''),
	title: v.optional(v.string(), '{pageTitle}'),
	includeTemplate: v.optional(v.boolean(), true),
	downloadImages: v.optional(v.boolean(), false),
	saveAs: v.optional(v.boolean(), false),
	obsidianVault: v.optional(v.string(), ''),
	obsidianFolder: v.optional(v.string(), ''),
	agentBridgeEnabled: v.optional(v.boolean(), false),
	agentBridgeHost: v.optional(v.string(), 'com.snipsnip.bridge'),
	notificationsEnabled: v.optional(v.boolean(), true),
	historyLimit: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 50),
	siteRules: v.optional(v.array(SiteRuleSchema), []),
	htmlTableFallback: v.optional(v.picklist(['auto', 'always', 'never']), 'auto'),
	resolveStyles: v.optional(v.boolean(), true),
});

export type ClipSettings = v.InferOutput<typeof ClipSettingsSchema>;
export type SiteRule = v.InferOutput<typeof SiteRuleSchema>;

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
