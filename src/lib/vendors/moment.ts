import type { MomentApi } from '@/lib/types';

import { getModuleDefaultExport, isFunction, loadVendorRuntime } from './runtime-loader';

export interface MomentLoadOptions {
	importModule?: () => Promise<unknown>;
}

export function getMomentApi(): MomentApi | undefined {
	return globalThis.moment;
}

function isMomentApi(value: unknown): value is MomentApi {
	return isFunction(value);
}

export async function loadMomentApi(options: MomentLoadOptions = {}): Promise<MomentApi> {
	return loadVendorRuntime({
		cacheKey: 'vendor:moment',
		label: 'moment',
		getValue: getMomentApi,
		setValue: (value) => {
			globalThis.moment = value;
		},
		importModule: options.importModule ?? (() => import('@/background/moment.min')),
		resolveModule: (loadedModule) => {
			const defaultExport = getModuleDefaultExport(loadedModule);
			return isMomentApi(defaultExport) ? defaultExport : undefined;
		},
	});
}
