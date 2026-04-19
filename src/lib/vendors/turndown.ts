import type { TurndownPluginGfmApi, TurndownServiceApi } from '@/lib/types';

import { getModuleDefaultExport, getObjectProperty, isFunction, isRecord, loadVendorRuntime } from './runtime-loader';

export interface TurndownRuntime {
	TurndownService: TurndownServiceApi;
	turndownPluginGfm: TurndownPluginGfmApi;
}

export interface TurndownLoadOptions {
	importTurndownServiceModule?: () => Promise<unknown>;
	importTurndownPluginGfmModule?: () => Promise<unknown>;
}

export function getTurndownServiceApi(): TurndownServiceApi | undefined {
	return globalThis.TurndownService;
}

export function getTurndownPluginGfmApi(): TurndownPluginGfmApi | undefined {
	return globalThis.turndownPluginGfm;
}

export function getTurndownRuntime(): TurndownRuntime | undefined {
	const TurndownService = getTurndownServiceApi();
	const turndownPluginGfm = getTurndownPluginGfmApi();

	if (!TurndownService || !turndownPluginGfm) {
		return undefined;
	}

	return {
		TurndownService,
		turndownPluginGfm,
	};
}

function isTurndownServiceApi(value: unknown): value is TurndownServiceApi {
	if (!isFunction(value)) {
		return false;
	}

	const prototype = getObjectProperty(value, 'prototype');
	if (!isRecord(prototype)) {
		return false;
	}

	return typeof prototype.turndown === 'function' && typeof prototype.addRule === 'function';
}

function isTurndownPluginGfmApi(value: unknown): value is TurndownPluginGfmApi {
	if (!isRecord(value)) {
		return false;
	}

	return 'highlightedCodeBlock' in value && 'strikethrough' in value && 'taskListItems' in value;
}

function resolveTurndownServiceModule(loadedModule: unknown): TurndownServiceApi | undefined {
	const defaultExport = getModuleDefaultExport(loadedModule);
	if (isTurndownServiceApi(defaultExport)) {
		return defaultExport;
	}

	return isTurndownServiceApi(loadedModule) ? loadedModule : undefined;
}

function resolveTurndownPluginGfmModule(loadedModule: unknown): TurndownPluginGfmApi | undefined {
	const defaultExport = getModuleDefaultExport(loadedModule);
	if (isTurndownPluginGfmApi(defaultExport)) {
		return defaultExport;
	}

	return isTurndownPluginGfmApi(loadedModule) ? loadedModule : undefined;
}

export async function loadTurndownRuntime(options: TurndownLoadOptions = {}): Promise<TurndownRuntime> {
	return loadVendorRuntime({
		cacheKey: 'vendor:turndown',
		label: 'Turndown runtime',
		getValue: getTurndownRuntime,
		setValue: (value) => {
			globalThis.TurndownService = value.TurndownService;
			globalThis.turndownPluginGfm = value.turndownPluginGfm;
		},
		importModule: async () => ({
			TurndownServiceModule: await (options.importTurndownServiceModule ?? (() => import('@/background/turndown')))(),
			TurndownPluginGfmModule: await (options.importTurndownPluginGfmModule
				?? (() => import('@/background/turndown-plugin-gfm')))(),
		}),
		resolveModule: (loadedModule) => {
			const TurndownService = resolveTurndownServiceModule(
				getObjectProperty(loadedModule, 'TurndownServiceModule'),
			);
			const turndownPluginGfm = resolveTurndownPluginGfmModule(
				getObjectProperty(loadedModule, 'TurndownPluginGfmModule'),
			);

			if (!TurndownService || !turndownPluginGfm) {
				return undefined;
			}

			return {
				TurndownService,
				turndownPluginGfm,
			};
		},
	});
}
