import type { ExtensionBrowserApi } from '@/lib/types/extension.ts';
import { browser } from 'wxt/browser';

// Legacy shim: some legacy globals-dependent code reads `globalThis.browser`.
// WXT's browser import already does the Chrome/Firefox detection — this just
// exposes it through the legacy path until all consumers migrate to imports.
Reflect.set(globalThis, 'browser', browser);

export function getBrowserApi(): ExtensionBrowserApi {
	return browser as unknown as ExtensionBrowserApi;
}

export async function loadBrowserApi(): Promise<ExtensionBrowserApi> {
	return browser as unknown as ExtensionBrowserApi;
}
