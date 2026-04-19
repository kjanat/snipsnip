/// <reference types="bun-types/test-globals" />

import type {
	ExtensionBrowserApi,
	ExtensionOptions,
	HighlightApi,
	MomentApi,
	ReadabilityApi,
	SnipSnipAgentBridgeStateApi,
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
	var defaultOptions: Partial<ExtensionOptions> | undefined;
	var hljs: HighlightApi | undefined;
	var moment: MomentApi | undefined;
	var Readability: ReadabilityApi | undefined;
	var snipSnipAgentBridgeState: SnipSnipAgentBridgeStateApi | undefined;
	var snipSnipDownloadTracker: SnipSnipDownloadTrackerApi | undefined;
	var snipSnipLibraryExport: SnipSnipLibraryExportApi | undefined;
	var snipSnipLibraryState: SnipSnipLibraryStateApi | undefined;
	var snipSnipMarkdownOptions: SnipSnipMarkdownOptionsApi | undefined;
	var snipSnipOptionsState: SnipSnipOptionsStateApi | undefined;
	var snipSnipTemplateUtils: SnipSnipTemplateUtilsApi | undefined;
	var snipSnipUrlUtils: SnipSnipUrlUtilsApi | undefined;
	var TurndownService: TurndownServiceApi | undefined;
	var turndownPluginGfm: TurndownPluginGfmApi | undefined;
}

export {};
