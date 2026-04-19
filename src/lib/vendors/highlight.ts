import type { HighlightApi } from '@/lib/types';

import { getModuleDefaultExport, isRecord, loadVendorRuntime } from './runtime-loader';

export interface HighlightLoadOptions {
	importModule?: () => Promise<unknown>;
}

export function getHighlightApi(): HighlightApi | undefined {
	return globalThis.hljs;
}

function isHighlightApi(value: unknown): value is HighlightApi {
	if (!isRecord(value)) {
		return false;
	}

	return typeof value.highlightAuto === 'function' || typeof value.getLanguage === 'function';
}

export async function loadHighlightApi(options: HighlightLoadOptions = {}): Promise<HighlightApi> {
	return loadVendorRuntime({
		cacheKey: 'vendor:highlight',
		label: 'highlight.js',
		getValue: getHighlightApi,
		setValue: (value) => {
			globalThis.hljs = value;
		},
		importModule: options.importModule ?? (() => import('@/highlight.min')),
		resolveModule: (loadedModule) => {
			const defaultExport = getModuleDefaultExport(loadedModule);
			return isHighlightApi(defaultExport) ? defaultExport : undefined;
		},
	});
}
