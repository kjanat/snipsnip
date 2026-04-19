/// <reference types="bun-types/test-globals" />

import type { SnipSnipAgentBridgeStateApi, SnipSnipDownloadTrackerApi, SnipSnipLibraryStateApi } from './lib/types';

declare global {
	var snipSnipAgentBridgeState: SnipSnipAgentBridgeStateApi | undefined;
	var snipSnipDownloadTracker: SnipSnipDownloadTrackerApi | undefined;
	var snipSnipLibraryState: SnipSnipLibraryStateApi | undefined;
}

export {};
