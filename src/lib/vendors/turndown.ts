import type { TurndownPluginGfmApi, TurndownServiceApi } from '@/lib/types/index.ts';
import TurndownService from 'turndown';
import { gfm, highlightedCodeBlock, strikethrough, tables, taskListItems } from 'turndown-plugin-gfm';

const turndownPluginGfm = { gfm, highlightedCodeBlock, strikethrough, tables, taskListItems };

globalThis.TurndownService = TurndownService as unknown as TurndownServiceApi;
globalThis.turndownPluginGfm = turndownPluginGfm as unknown as TurndownPluginGfmApi;

export interface TurndownRuntime {
	TurndownService: TurndownServiceApi;
	turndownPluginGfm: TurndownPluginGfmApi;
}

export function getTurndownServiceApi(): TurndownServiceApi {
	return globalThis.TurndownService as TurndownServiceApi;
}

export function getTurndownPluginGfmApi(): TurndownPluginGfmApi {
	return globalThis.turndownPluginGfm as TurndownPluginGfmApi;
}

export function getTurndownRuntime(): TurndownRuntime {
	return {
		TurndownService: getTurndownServiceApi(),
		turndownPluginGfm: getTurndownPluginGfmApi(),
	};
}

export async function loadTurndownRuntime(): Promise<TurndownRuntime> {
	return getTurndownRuntime();
}
