/// <reference types="bun-types/test-globals" />

import type {
	ExtensionBrowserApi,
	ExtensionOptions,
	HighlightApi,
	MomentApi,
	ReadabilityApi,
	SnipSnipAgentBridgeStateApi,
	SnipSnipContextMenusApi,
	SnipSnipDefaultOptionsApi,
	SnipSnipDownloadTrackerApi,
	SnipSnipLibraryExportApi,
	SnipSnipLibraryStateApi,
	SnipSnipMarkdownOptionsApi,
	SnipSnipOptionsStateApi,
	SnipSnipTemplateUtilsApi,
	SnipSnipUrlUtilsApi,
	TurndownPluginGfmApi,
	TurndownServiceApi,
} from './lib/types';

declare global {
	var browser: ExtensionBrowserApi | undefined;
	var defaultOptions: Record<string, unknown> | undefined;
	var hljs: HighlightApi | undefined;
	var moment: MomentApi | undefined;
	var Readability: ReadabilityApi | undefined;
	var snipSnipAgentBridgeState: SnipSnipAgentBridgeStateApi | undefined;
	var snipSnipContextMenus: SnipSnipContextMenusApi | undefined;
	var snipSnipDefaultOptions: SnipSnipDefaultOptionsApi | undefined;
	var snipSnipDownloadTracker: SnipSnipDownloadTrackerApi | undefined;
	var snipSnipLibraryExport: SnipSnipLibraryExportApi | undefined;
	var snipSnipLibraryState: SnipSnipLibraryStateApi | undefined;
	var snipSnipMarkdownOptions: SnipSnipMarkdownOptionsApi | undefined;
	var snipSnipNotifications: Record<string, unknown> | undefined;
	var snipSnipOptionsState: SnipSnipOptionsStateApi | undefined;
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
	var TurndownService: TurndownServiceApi | undefined;
	var turndownPluginGfm: TurndownPluginGfmApi | undefined;
}

export {};
