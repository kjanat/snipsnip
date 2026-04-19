export const BUILTIN_SEND_TO_TARGET_IDS = ['chatgpt', 'claude', 'perplexity'] as const;

export const DEFAULT_EXPORT_TYPES = ['markdown', 'html', 'text', 'pdf', 'copy', 'sendTo'] as const;

export const DOWNLOAD_MODES = ['downloadsApi', 'contentLink'] as const;

export const IMAGE_STYLES = [
	'originalSource',
	'noImage',
	'markdown',
	'base64',
	'obsidian',
	'obsidian-nofolder',
] as const;

export const IMAGE_REF_STYLES = ['inlined', 'referenced'] as const;

export const POPUP_THEMES = ['system', 'light', 'dark'] as const;

export const SPECIAL_THEMES = ['none', 'atla', 'ben10', 'claude', 'perplexity', 'openai'] as const;

export const COLOR_BLIND_THEMES = ['deuteranopia', 'protanopia', 'tritanopia'] as const;

export type BuiltinSendToTargetId = (typeof BUILTIN_SEND_TO_TARGET_IDS)[number];

export type CustomSendToTargetId = `custom-${string}`;

export type SendToTargetId = BuiltinSendToTargetId | CustomSendToTargetId;

export type DefaultExportType = (typeof DEFAULT_EXPORT_TYPES)[number];

export type DownloadMode = (typeof DOWNLOAD_MODES)[number];

export type ImageStyle = (typeof IMAGE_STYLES)[number];

export type ImageRefStyle = (typeof IMAGE_REF_STYLES)[number];

export type PopupTheme = (typeof POPUP_THEMES)[number];

export type SpecialTheme = (typeof SPECIAL_THEMES)[number];

export type ColorBlindTheme = (typeof COLOR_BLIND_THEMES)[number];

export interface TableFormattingOptions {
	stripLinks: boolean;
	stripFormatting: boolean;
	prettyPrint: boolean;
	centerText: boolean;
}

export interface SendToCustomTarget {
	id: CustomSendToTargetId;
	name: string;
	urlTemplate: string;
}

export interface SiteRuleOverrides {
	includeTemplate?: boolean;
	downloadImages?: boolean;
	frontmatter?: string;
	backmatter?: string;
	title?: string;
	imagePrefix?: string;
	mdClipsFolder?: string | null;
	imageStyle?: ImageStyle;
	imageRefStyle?: ImageRefStyle;
	tableFormatting?: Partial<TableFormattingOptions>;
}

export interface SiteRule {
	id: string;
	name: string;
	enabled: boolean;
	pattern: string;
	overrides: SiteRuleOverrides;
}

export interface ExtensionOptions {
	headingStyle: string;
	hr: string;
	bulletListMarker: string;
	codeBlockStyle: string;
	fence: string;
	preserveCodeFormatting: boolean;
	autoDetectCodeLanguage: boolean;
	emDelimiter: string;
	strongDelimiter: string;
	linkStyle: string;
	linkReferenceStyle: string;
	imageStyle: ImageStyle;
	imageRefStyle: ImageRefStyle;
	tableFormatting: TableFormattingOptions;
	frontmatter: string;
	backmatter: string;
	title: string;
	includeTemplate: boolean;
	saveAs: boolean;
	downloadImages: boolean;
	imagePrefix: string;
	mdClipsFolder: string | null;
	disallowedChars: string;
	downloadMode: DownloadMode;
	defaultExportType: DefaultExportType;
	defaultSendToTarget: SendToTargetId;
	sendToCustomTargets: SendToCustomTarget[];
	sendToMaxUrlLength: number;
	turndownEscape: boolean;
	hashtagHandling: string;
	contextMenus: boolean;
	batchProcessingEnabled: boolean;
	obsidianIntegration: boolean;
	obsidianVault: string;
	obsidianFolder: string;
	popupTheme: PopupTheme;
	specialTheme: SpecialTheme;
	colorBlindTheme: ColorBlindTheme;
	specialThemeIcon: boolean;
	popupAccent: string;
	compactMode: boolean;
	showThemeToggleInPopup: boolean;
	showUserGuideIcon: boolean;
	editorTheme: string;
	siteRules: SiteRule[];
}

export interface ArticleContent {
	title?: string;
	pageTitle?: string;
	byline?: string | null;
	excerpt?: string;
	content?: string;
	textContent?: string;
	length?: number;
	keywords?: string[];
	baseURI?: string;
	pageURL?: string;
	tabURL?: string;
	uriBase?: string;
	math?: string;
}

export interface ClipSnapshot {
	title?: string;
	pageUrl?: string;
	normalizedPageUrl?: string;
	markdown?: string;
	savedAt?: string;
	previewText?: string;
	id?: string;
}

export interface LibraryItem extends
	Required<
		Pick<ClipSnapshot, 'id' | 'pageUrl' | 'normalizedPageUrl' | 'title' | 'markdown' | 'savedAt' | 'previewText'>
	>
{}

export interface LibrarySettings {
	enabled: boolean;
	autoSaveOnPopupOpen: boolean;
	itemsToKeep: number;
}

export interface AgentBridgeSettings {
	enabled: boolean;
}

export interface AgentBridgeStatus {
	enabled: boolean;
	permissionGranted: boolean;
	connecting: boolean;
	connected: boolean;
	hostInstalled: boolean;
	browser: string;
	hostVersion: string;
	lastError: string;
	updatedAt: string;
}

export interface AgentBridgeLatestClip {
	title: string;
	markdown: string;
	pageUrl: string;
	normalizedPageUrl: string;
	updatedAt: string;
	source: 'popup';
}

export interface NotificationMetricsDelta {
	downloads?: number;
	exports?: number;
	copies?: number;
	obsidianSends?: number;
	batchUrls?: number;
}

export interface DownloadTrackingInfo {
	filename?: string | null;
	url?: string;
	isMarkdown?: boolean;
	isImage?: boolean;
	notificationDelta?: NotificationMetricsDelta | null;
	tabId?: number | null;
}

export interface DownloadTrackerState {
	activeDownloads: Map<number, string>;
	snipSnipDownloads: Map<number, DownloadTrackingInfo>;
	snipSnipUrls: Map<string, DownloadTrackingInfo>;
	snipSnipBlobUrls: Set<string>;
}

export interface ExtensionStorageArea {
	get(keys?: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>>;
	set?(items: Record<string, unknown>): Promise<void>;
	remove?(keys: string | string[]): Promise<void>;
}

export type ExtensionBrowserApi = typeof import('wxt/browser').browser;

export interface SnipSnipTemplateUtilsApi {
	textReplace(template: string, article: Record<string, unknown>, disallowedChars?: string | null): string;
	generateValidFileName(title: unknown, disallowedChars?: string | null): string | null;
}

export interface SnipSnipUrlUtilsApi {
	safeParseUrl(urlString: string): URL | null;
	resolveArticleUrl(domBaseUri: string, pageUrl?: string): URL | null;
	validateUri(href: string, baseURI: string): string;
	getImageFilename(
		src: string,
		options?: Partial<ExtensionOptions> & Record<string, unknown>,
		prependFilePath?: boolean,
	): string;
}

export interface LibraryExportFile {
	filename: string;
	content: string;
}

export interface SnipSnipLibraryExportApi {
	createLibraryExportZipFilename(date?: Date, prefix?: string): string;
	ensureUniqueLibraryExportPath(filePath: string, usedPaths?: Set<string>): string;
	createLibraryExportFiles(
		items?: Array<Partial<LibraryItem>>,
		options?: {
			generateValidFileName?: (value: unknown, disallowedChars?: string | null) => string | null;
			ensureUniquePath?: (filePath: string, usedPaths?: Set<string>) => string;
			usedPaths?: Set<string>;
			disallowedChars?: string | null;
		},
	): LibraryExportFile[];
}

export interface SendToUrlTemplateValidation {
	valid: boolean;
	normalizedValue: string;
	error: string;
}

export interface CustomSendToTargetInput {
	id?: string;
	name?: string;
	urlTemplate?: string;
	url?: string;
}

export interface OptionsResetResult {
	options: Record<string, unknown>;
	contextMenuAction: 'none' | 'create' | 'remove';
}

export interface SnipSnipOptionsStateApi {
	buildExportFilename(date?: Date | string, prefix?: string): string;
	normalizeImportedOptions(
		importedOptions?: Record<string, unknown>,
		defaultOptions?: Record<string, unknown>,
	): Record<string, unknown>;
	getContextMenuTransition(
		previousOptions?: Record<string, unknown>,
		nextOptions?: Record<string, unknown>,
	): 'none' | 'create' | 'remove';
	resetOptionKeys(
		currentOptions?: Record<string, unknown>,
		defaultOptions?: Record<string, unknown>,
		keys?: string[] | string,
	): OptionsResetResult;
	resetAllOptions(
		currentOptions?: Record<string, unknown>,
		defaultOptions?: Record<string, unknown>,
	): OptionsResetResult;
	validateSendToUrlTemplate(value?: string): SendToUrlTemplateValidation;
	normalizeCustomSendToTargets(targets?: CustomSendToTargetInput[]): SendToCustomTarget[];
	normalizeDefaultSendToTarget(
		targetValue?: string,
		customTargets?: SendToCustomTarget[],
		fallbackValue?: string,
	): string;
	normalizeSendToMaxUrlLength(value?: unknown, fallbackValue?: unknown): number;
}

export interface EffectiveMarkdownOptions extends Record<string, unknown> {
	frontmatter: string;
	backmatter: string;
	imagePrefix: string;
	disallowedChars: string;
	tableFormatting?: TableFormattingOptions | Partial<TableFormattingOptions>;
	includeTemplate?: boolean;
	downloadImages?: boolean;
}

export interface SnipSnipMarkdownOptionsApi {
	createEffectiveMarkdownOptions(
		article: Record<string, unknown>,
		providedOptions?: Partial<ExtensionOptions> | Record<string, unknown> | null,
		downloadImages?: boolean | null,
	): EffectiveMarkdownOptions;
}

export interface SnipSnipObsidianApi {
	createObsidianSourceImageMap(imageList?: Record<string, string>): Record<string, string>;
	getObsidianTransportOptions(options?: Record<string, unknown>): Record<string, unknown>;
	prepareMarkdownForObsidian(markdown: string, sourceImageMap?: Record<string, string>): string;
}

export interface SnipSnipCountUtilsApi {
	COUNT_MODES: readonly string[];
	DEFAULT_READING_WORDS_PER_MINUTE: number;
	getWordCount(text: unknown): number;
	estimateTokens(text: unknown): number;
	estimateReadingMinutes(text: unknown, wordsPerMinute?: number): number;
	formatCountDisplay(text: unknown, mode: string): string;
}

export interface SnipSnipLibraryStateApi {
	STORAGE_KEYS: Readonly<{
		SETTINGS: string;
		ITEMS: string;
	}>;
	DEFAULT_LIBRARY_SETTINGS: Readonly<LibrarySettings>;
	sanitizeItemsToKeep(value?: unknown, fallback?: number): number;
	normalizeLibrarySettings(settings?: Partial<LibrarySettings>): LibrarySettings;
	normalizePageUrl(url?: string): string;
	buildPreviewText(markdown?: string, maxLength?: number): string;
	createLibraryItem(snapshot?: ClipSnapshot, savedAt?: string): LibraryItem;
	upsertLibraryItem(items?: LibraryItem[], nextItem?: ClipSnapshot, itemsToKeep?: number): LibraryItem[];
	trimLibraryItems(items?: LibraryItem[], itemsToKeep?: number): LibraryItem[];
	loadLibrarySettings(storage?: ExtensionStorageArea): Promise<LibrarySettings>;
	saveLibrarySettings(settings: Partial<LibrarySettings>, storage?: ExtensionStorageArea): Promise<LibrarySettings>;
	resetLibrarySettings(storage?: ExtensionStorageArea): Promise<LibrarySettings>;
	loadLibraryItems(storage?: ExtensionStorageArea): Promise<LibraryItem[]>;
	saveLibraryItems(items: LibraryItem[], storage?: ExtensionStorageArea): Promise<LibraryItem[]>;
	clearLibraryItems(storage?: ExtensionStorageArea): Promise<LibraryItem[]>;
	trimStoredLibraryItems(itemsToKeep: number, storage?: ExtensionStorageArea): Promise<LibraryItem[]>;
}

export interface SnipSnipAgentBridgeStateApi {
	STORAGE_KEYS: Readonly<{
		SETTINGS: string;
		STATUS: string;
		LATEST_CLIP: string;
	}>;
	DEFAULT_SETTINGS: Readonly<AgentBridgeSettings>;
	DEFAULT_STATUS: Readonly<AgentBridgeStatus>;
	DEFAULT_LATEST_CLIP: Readonly<AgentBridgeLatestClip>;
	normalizePageUrl(url?: string): string;
	normalizeSettings(settings?: Partial<AgentBridgeSettings>): AgentBridgeSettings;
	normalizeStatus(status?: Partial<AgentBridgeStatus>): AgentBridgeStatus;
	normalizeLatestClip(snapshot?: Partial<AgentBridgeLatestClip>): AgentBridgeLatestClip;
	hasUsableLatestClip(snapshot?: Partial<AgentBridgeLatestClip>): boolean;
	shouldUseLatestClipForPage(snapshot: Partial<AgentBridgeLatestClip> | undefined, pageUrl: string): boolean;
	loadSettings(storage?: ExtensionStorageArea): Promise<AgentBridgeSettings>;
	saveSettings(settings: Partial<AgentBridgeSettings>, storage?: ExtensionStorageArea): Promise<AgentBridgeSettings>;
	loadStatus(storage?: ExtensionStorageArea): Promise<AgentBridgeStatus>;
	saveStatus(status: Partial<AgentBridgeStatus>, storage?: ExtensionStorageArea): Promise<AgentBridgeStatus>;
	loadLatestClip(storage?: ExtensionStorageArea): Promise<AgentBridgeLatestClip>;
	saveLatestClip(
		snapshot: Partial<AgentBridgeLatestClip>,
		storage?: ExtensionStorageArea,
	): Promise<AgentBridgeLatestClip>;
	clearLatestClip(storage?: ExtensionStorageArea): Promise<AgentBridgeLatestClip>;
}

export interface DownloadChangeDeps {
	logComplete?(downloadId: number): void;
	logInterrupted?(downloadId: number, error: unknown): void;
	recordNotificationMetrics?(delta: NotificationMetricsDelta, tabId?: number | null): Promise<void>;
	onMetricsError?(error: unknown): void;
}

export interface DownloadTrackerApi {
	getState(): DownloadTrackerState;
	trackUrl(url: string, info?: DownloadTrackingInfo): void;
	setActiveDownload(downloadId: number, url: string): void;
	moveTrackedUrlToDownloadId(downloadId: number, url: string): DownloadTrackingInfo | null | undefined;
	trackDownload(downloadId: number, info?: DownloadTrackingInfo): void;
	handleDownloadComplete(message?: { downloadId?: number; url?: string }): void;
	cleanupTrackedDownload(downloadId: number, url?: string | null, downloadInfo?: DownloadTrackingInfo): void;
	handleDownloadChange(
		delta: { id: number; state?: { current?: string }; error?: unknown },
		deps?: DownloadChangeDeps,
	): Promise<void>;
	handleFilenameConflict(
		downloadItem: { id: number; url?: string },
		suggest: (suggestion: { filename: string; conflictAction: 'uniquify' }) => void,
	): boolean;
}

export interface SnipSnipDownloadTrackerApi {
	createDownloadTracker(options?: {
		activeDownloads?: Map<number, string>;
		snipSnipDownloads?: Map<number, DownloadTrackingInfo>;
		snipSnipUrls?: Map<string, DownloadTrackingInfo>;
		snipSnipBlobUrls?: Set<string>;
		sendCleanupBlobUrl?: (url: string) => Promise<void>;
	}): DownloadTrackerApi;
}

export interface SnipSnipDefaultOptionsApi {
	defaultOptions: Record<string, unknown>;
	LEGACY_DEFAULT_FRONTMATTER: string;
	getOptions(): Promise<Record<string, unknown>>;
}

export interface SnipSnipContextMenusApi {
	createMenus(): Promise<void>;
}

export interface MomentValue {
	format(pattern: string): string;
}

export interface MomentApi {
	(value?: Date | number | string | null): MomentValue;
}

export interface HighlightAutoResult {
	language?: string;
	relevance?: number;
}

export interface HighlightApi {
	highlightAuto?(code: string): HighlightAutoResult;
	getLanguage?(languageName: string): unknown;
}

export interface ReadabilityApi {
	new(document: Document, options?: Record<string, unknown>): {
		parse(): ArticleContent | null;
	};
}

export interface TurndownRule {
	filter: unknown;
	replacement: (...args: unknown[]) => string;
}

export interface TurndownServiceInstance {
	escape(text: string): string;
	use(plugins: unknown[] | unknown): void;
	addRule(name: string, rule: TurndownRule): void;
	turndown(input: string): string;
}

export interface TurndownServiceApi {
	new(options?: Record<string, unknown>): TurndownServiceInstance;
	prototype: {
		escape(text: string): string;
		defaultEscape?: ((text: string) => string) | undefined;
	};
}

export interface TurndownPluginGfmApi {
	highlightedCodeBlock: unknown;
	strikethrough: unknown;
	taskListItems: unknown;
	tables?: unknown;
}
