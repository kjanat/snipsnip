import { getItemsBag } from '@/shared/storage.ts';

export const defaultOptions = {
	headingStyle: 'atx',
	hr: '___',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced',
	fence: '```',
	preserveCodeFormatting: false,
	autoDetectCodeLanguage: true,
	emDelimiter: '_',
	strongDelimiter: '**',
	linkStyle: 'inlined',
	linkReferenceStyle: 'full',
	imageStyle: 'markdown',
	imageRefStyle: 'inlined',
	tableFormatting: {
		stripLinks: true,
		stripFormatting: false,
		prettyPrint: true,
		centerText: true,
	},
	frontmatter:
		'---\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: [{keywords}]\nsource: {pageURL}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## Excerpt\n> {excerpt}\n\n---',
	backmatter: '',
	title: '{pageTitle}',
	includeTemplate: false,
	saveAs: false,
	downloadImages: false,
	imagePrefix: '{pageTitle}/',
	mdClipsFolder: null,
	disallowedChars: '[]#^',
	downloadMode: 'downloadsApi',
	defaultExportType: 'markdown',
	defaultSendToTarget: 'chatgpt',
	sendToCustomTargets: [],
	sendToMaxUrlLength: 3600,
	turndownEscape: true,
	hashtagHandling: 'keep',
	contextMenus: true,
	batchProcessingEnabled: true,
	obsidianIntegration: false,
	obsidianVault: '',
	obsidianFolder: '',
	popupTheme: 'system',
	specialTheme: 'none',
	colorBlindTheme: 'deuteranopia',
	specialThemeIcon: true,
	popupAccent: 'sage',
	compactMode: false,
	showThemeToggleInPopup: true,
	showUserGuideIcon: true,
	editorTheme: 'default',
	siteRules: [],
};

export const LEGACY_DEFAULT_FRONTMATTER =
	'---\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: [{keywords}]\nsource: {baseURI}\nauthor: {byline}\n---\n\n# {pageTitle}\n\n> ## Excerpt\n> {excerpt}\n\n---';

export async function getOptions() {
	let options = { ...defaultOptions };

	try {
		options = await getItemsBag('sync', defaultOptions);
	} catch (error) {
		console.error(error);
	}

	if (options.frontmatter === LEGACY_DEFAULT_FRONTMATTER) {
		options.frontmatter = defaultOptions.frontmatter;
	}

	const siteRulesApi = globalThis.snipSnipSiteRules;
	if (siteRulesApi?.normalizeSiteRules) {
		const normalized = siteRulesApi.normalizeSiteRules(options.siteRules) as never[];
		options.siteRules = normalized;
	} else if (!Array.isArray(options.siteRules)) {
		options.siteRules = [];
	}

	if (!browser?.downloads) {
		options.downloadMode = 'contentLink';
	}

	return options;
}
