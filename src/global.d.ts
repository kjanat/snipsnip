/// <reference types="bun-types/test-globals" />

import type {
	HighlightApi,
	MomentApi,
	ReadabilityApi,
	SnipSnipAgentBridgeStateApi,
	SnipSnipContextMenusApi,
	SnipSnipCountUtilsApi,
	SnipSnipDefaultOptionsApi,
	SnipSnipDownloadTrackerApi,
	SnipSnipLibraryExportApi,
	SnipSnipLibraryStateApi,
	SnipSnipMarkdownOptionsApi,
	SnipSnipObsidianApi,
	SnipSnipOptionsStateApi,
	SnipSnipTemplateUtilsApi,
	SnipSnipUrlUtilsApi,
	TurndownPluginGfmApi,
	TurndownServiceApi,
} from '@/lib/types/index.ts';

interface SnipSnipSelectionUtilsApi {
	buildDomWithSelection(domString: string, selectionHtml: string, shouldUseSelection?: boolean): string;
}

interface SnipSnipHashtagUtilsApi {
	hashtagEscapeSentinel: string;
	normalizeHashtagHandlingMode(mode: unknown): 'remove' | 'escape' | 'keep';
	replaceHashtagTokensInText(text: string, mode: 'remove' | 'escape' | 'keep'): string;
	applyHashtagHandlingToHtml(content: string, mode: 'remove' | 'escape' | 'keep'): string;
	applyHashtagHandlingToMarkdown(markdown: string, mode: 'remove' | 'escape' | 'keep'): string;
}

interface SnipSnipCodeBlockUtilsApi {
	repeat(character: string, count: number): string;
	convertToFencedCodeBlock(node: Element, options: Record<string, unknown>): string;
}

interface SnipSnipReadabilityRecoveryApi {
	anchorAttribute: string;
	annotateStructuralAnchors(document: Document): number;
	analyzeNarrowExtraction(document: Document, articleHtml: string | null | undefined): Record<string, unknown> | null;
	applyRepeatedSectionPromotion(document: Document, recoveryPlan: Record<string, unknown> | null | undefined): {
		changed: boolean;
		promotedIds: string[];
	};
	buildRepeatedSectionFragment(document: Document, recoveryPlan: Record<string, unknown> | null | undefined): {
		html: string;
	} | null;
	restoreSemanticTables?(document: Document, articleHtml: string | null | undefined): string | null;
	restoreMissingPrimaryHeadings?(document: Document, articleHtml: string | null | undefined): string | null;
	stripStructuralAnchorsFromHtml(articleHtml: string | null | undefined): string;
}

declare global {
	interface globalThis {
		browser: typeof import('wxt/browser').browser;
	}
	var defaultOptions: Record<string, unknown> | undefined;
	var hljs: HighlightApi | undefined;
	var moment: MomentApi | undefined;
	var mimedb: Record<string, string> | undefined;
	var Readability: ReadabilityApi | undefined;
	var snipSnipCountUtils: SnipSnipCountUtilsApi | undefined;
	var snipSnipAgentBridgeState: SnipSnipAgentBridgeStateApi | undefined;
	var snipSnipContextMenus: SnipSnipContextMenusApi | undefined;
	var snipSnipDefaultOptions: SnipSnipDefaultOptionsApi | undefined;
	var snipSnipDownloadTracker: SnipSnipDownloadTrackerApi | undefined;
	var snipSnipLibraryExport: SnipSnipLibraryExportApi | undefined;
	var snipSnipLibraryState: SnipSnipLibraryStateApi | undefined;
	var snipSnipMarkdownOptions: SnipSnipMarkdownOptionsApi | undefined;
	var snipSnipSelectionUtils: SnipSnipSelectionUtilsApi | undefined;
	var snipSnipHashtagUtils: SnipSnipHashtagUtilsApi | undefined;
	var snipSnipNotifications: Record<string, unknown> | undefined;
	var snipSnipObsidian: SnipSnipObsidianApi | undefined;
	var snipSnipOptionsState: SnipSnipOptionsStateApi | undefined;
	var snipSnipOptionsSearch:
		| {
			buildSearchIndex(rootNode: Document): Array<{ card: HTMLElement; section: HTMLElement }>;
			normalizeSearchText(value: unknown): string;
			searchSettings(
				index: Array<{ card: HTMLElement; section: HTMLElement }>,
				query: string,
			): {
				results: Array<{
					card: HTMLElement;
					section: HTMLElement;
					matches: boolean;
					tokenMatches: Array<{ token: string; fieldSource: string }>;
				}>;
			};
		}
		| undefined;
	var snipSnipPagePaths:
		| {
			guide: string;
			options: string;
		}
		| undefined;
	var snipSnipPopupAssets: Record<string, string> | undefined;
	var snipSnipSiteRules:
		| {
			normalizeSiteRules?(rules: unknown): unknown[];
			normalizeSiteRuleOverrides?(overrides: unknown): Record<string, unknown>;
			validateSiteRulePattern?(pattern: unknown): {
				valid: boolean;
				error: string;
				normalizedPattern: string;
			};
			resolveSiteRuleOptions?(pageUrl: string, options: Record<string, unknown>): {
				options: Record<string, unknown>;
				matchedRule: unknown;
				overriddenKeys: string[];
			};
		}
		| undefined;
	var snipSnipTemplateUtils: SnipSnipTemplateUtilsApi | undefined;
	var snipSnipUrlUtils: SnipSnipUrlUtilsApi | undefined;
	var snipSnipCodeBlockUtils: SnipSnipCodeBlockUtilsApi | undefined;
	var SnipSnipReadabilityRecovery: SnipSnipReadabilityRecoveryApi | undefined;
	var snipSnipUseImportedBackground: boolean | undefined;
	var getSelectionAndDom: (() => { selection: string; dom: string; pageUrl: string } | null) | undefined;
	var snipsnipPrepareForCapture: (() => Promise<void>) | undefined;
	var TurndownService: TurndownServiceApi | undefined;
	var turndownPluginGfm: TurndownPluginGfmApi | undefined;
}
