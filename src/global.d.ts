/// <reference types="bun-types/test-globals" />

import type {
	ExtensionBrowserApi,
	ExtensionOptions,
	SnipSnipAgentBridgeStateApi,
	SnipSnipDownloadTrackerApi,
	SnipSnipLibraryExportApi,
	SnipSnipLibraryStateApi,
	SnipSnipMarkdownOptionsApi,
	SnipSnipOptionsStateApi,
	SnipSnipTemplateUtilsApi,
	SnipSnipUrlUtilsApi,
} from './lib/types';

declare global {
	var browser: ExtensionBrowserApi | undefined;
	var defaultOptions: Partial<ExtensionOptions> | undefined;
	var moment: ((value: Date) => { format(pattern: string): string }) | undefined;
	var snipSnipAgentBridgeState: SnipSnipAgentBridgeStateApi | undefined;
	var snipSnipDownloadTracker: SnipSnipDownloadTrackerApi | undefined;
	var snipSnipLibraryExport: SnipSnipLibraryExportApi | undefined;
	var snipSnipLibraryState: SnipSnipLibraryStateApi | undefined;
	var snipSnipMarkdownOptions: SnipSnipMarkdownOptionsApi | undefined;
	var snipSnipOptionsState: SnipSnipOptionsStateApi | undefined;
	var snipSnipTemplateUtils: SnipSnipTemplateUtilsApi | undefined;
	var snipSnipUrlUtils: SnipSnipUrlUtilsApi | undefined;
}

export {};
