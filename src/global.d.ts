/// <reference types="bun-types/test-globals" />

import type {
	ExtensionOptions,
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

declare global {
	interface globalThis {
		browser: typeof import('wxt/browser').browser;
	}
	var defaultOptions: Record<string, unknown> | undefined;
	var hljs: HighlightApi | undefined;
	var moment: MomentApi | undefined;
	var Readability: ReadabilityApi | undefined;
	var snipSnipCountUtils: SnipSnipCountUtilsApi | undefined;
	var snipSnipAgentBridgeState: SnipSnipAgentBridgeStateApi | undefined;
	var snipSnipContextMenus: SnipSnipContextMenusApi | undefined;
	var snipSnipDefaultOptions: SnipSnipDefaultOptionsApi | undefined;
	var snipSnipDownloadTracker: SnipSnipDownloadTrackerApi | undefined;
	var snipSnipLibraryExport: SnipSnipLibraryExportApi | undefined;
	var snipSnipLibraryState: SnipSnipLibraryStateApi | undefined;
	var snipSnipMarkdownOptions: SnipSnipMarkdownOptionsApi | undefined;
	var snipSnipNotifications: Record<string, unknown> | undefined;
	var snipSnipObsidian: SnipSnipObsidianApi | undefined;
	var snipSnipOptionsState: SnipSnipOptionsStateApi | undefined;
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
			resolveSiteRuleOptions?(pageUrl: string, options: Record<string, unknown>): {
				options: Record<string, unknown>;
				matchedRule: unknown;
				overriddenKeys: string[];
			};
		}
		| undefined;
	var snipSnipTemplateUtils: SnipSnipTemplateUtilsApi | undefined;
	var snipSnipUrlUtils: SnipSnipUrlUtilsApi | undefined;
	var snipSnipUseImportedBackground: boolean | undefined;
	var getSelectionAndDom: (() => { selection: string; dom: string; pageUrl: string } | null) | undefined;
	var snipsnipPrepareForCapture: (() => Promise<void>) | undefined;
	var TurndownService: TurndownServiceApi | undefined;
	var turndownPluginGfm: TurndownPluginGfmApi | undefined;
}

export {};
