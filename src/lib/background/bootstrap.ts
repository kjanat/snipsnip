import { createMenus } from '@/lib/background/context-menus-runtime.js';
import { installWxtPagePaths } from '@/lib/page-paths.ts';
import agentBridgeState from '@/shared/agent-bridge-state.ts';
import downloadTracker from '@/shared/download-tracker.ts';
import libraryExport from '@/shared/library-export.ts';
import notifications from '@/shared/notifications.ts';
import siteRules from '@/shared/site-rules.ts';
import momentApi from 'moment';
import { defaultOptions, getOptions, LEGACY_DEFAULT_FRONTMATTER } from './default-options-runtime.ts';

installWxtPagePaths();
globalThis.snipSnipUseImportedBackground = true;
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
