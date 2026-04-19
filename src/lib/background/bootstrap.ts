import momentApi from '@/background/moment.min';
import agentBridgeState from '@/shared/agent-bridge-state';
import downloadTracker from '@/shared/download-tracker';
import libraryExport from '@/shared/library-export';
import notifications from '@/shared/notifications';
import siteRules from '@/shared/site-rules';

import { installWxtPagePaths } from '@/lib/page-paths';
import { createMenus } from './context-menus-runtime';
import { defaultOptions, getOptions, LEGACY_DEFAULT_FRONTMATTER } from './default-options-runtime';

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
