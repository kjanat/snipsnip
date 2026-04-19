import momentApi from '../../background/moment.min.ts';
import browserApi from '../../browser-polyfill.min.ts';
import agentBridgeState from '../../shared/agent-bridge-state.ts';
import downloadTracker from '../../shared/download-tracker.ts';
import libraryExport from '../../shared/library-export.ts';
import notifications from '../../shared/notifications.ts';
import siteRules from '../../shared/site-rules.ts';

import { installWxtPagePaths } from '../page-paths.ts';
import { createMenus } from './context-menus-runtime.ts';
import { defaultOptions, getOptions, LEGACY_DEFAULT_FRONTMATTER } from './default-options-runtime.ts';

installWxtPagePaths();
globalThis.snipSnipUseImportedBackground = true;
globalThis.browser ??= browserApi;
globalThis.moment ??= momentApi;
globalThis.defaultOptions ??= defaultOptions;
globalThis.snipSnipAgentBridgeState ??= agentBridgeState;
globalThis.snipSnipContextMenus ??= { createMenus };
globalThis.snipSnipDefaultOptions ??= {
	defaultOptions,
	LEGACY_DEFAULT_FRONTMATTER,
	getOptions,
};
globalThis.snipSnipDownloadTracker ??= downloadTracker;
globalThis.snipSnipLibraryExport ??= libraryExport;
globalThis.snipSnipNotifications ??= notifications;
globalThis.snipSnipSiteRules ??= siteRules;
