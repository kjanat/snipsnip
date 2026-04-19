import type { ExtensionBrowserApi } from '@/lib/types/extension.ts';

import { getModuleDefaultExport, isRecord, loadVendorRuntime } from './runtime-loader.ts';

export interface BrowserPolyfillLoadOptions {
	importModule?: () => Promise<unknown>;
}

export function getBrowserApi(): ExtensionBrowserApi | undefined {
	return browser;
}

function isBrowserApi(value: unknown): value is ExtensionBrowserApi {
	return isRecord(value);
}

export async function loadBrowserApi(options: BrowserPolyfillLoadOptions = {}): Promise<ExtensionBrowserApi> {
	return loadVendorRuntime({
		cacheKey: 'vendor:browser-polyfill',
		label: 'browser polyfill',
		getValue: getBrowserApi,
		setValue: (value) => {
			Reflect.set(globalThis, 'browser', value);
		},
		importModule: options.importModule ?? (() => import('@/browser-polyfill.min.js')),
		resolveModule: (loadedModule) => {
			const defaultExport = getModuleDefaultExport(loadedModule);
			return isBrowserApi(defaultExport) ? defaultExport : undefined;
		},
	});
}
