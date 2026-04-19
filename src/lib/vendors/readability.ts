import type { ReadabilityApi } from '@/lib/types/index.ts';

import {
	getModuleDefaultExport,
	getObjectProperty,
	isFunction,
	isRecord,
	loadVendorRuntime,
} from './runtime-loader.ts';

export interface ReadabilityLoadOptions {
	importModule?: () => Promise<unknown>;
}

export function getReadabilityApi(): ReadabilityApi | undefined {
	return globalThis.Readability;
}

function isReadabilityApi(value: unknown): value is ReadabilityApi {
	if (!isFunction(value)) {
		return false;
	}

	const prototype = getObjectProperty(value, 'prototype');
	return isRecord(prototype) && typeof prototype.parse === 'function';
}

export async function loadReadabilityApi(options: ReadabilityLoadOptions = {}): Promise<ReadabilityApi> {
	return loadVendorRuntime({
		cacheKey: 'vendor:readability',
		label: 'Readability',
		getValue: getReadabilityApi,
		setValue: (value) => {
			globalThis.Readability = value;
		},
		importModule: options.importModule ?? (() => import('@/background/Readability.js')),
		resolveModule: (loadedModule) => {
			const defaultExport = getModuleDefaultExport(loadedModule);
			if (isReadabilityApi(defaultExport)) {
				return defaultExport;
			}

			return isReadabilityApi(loadedModule) ? loadedModule : undefined;
		},
	});
}
