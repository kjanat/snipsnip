import { storage } from '#imports';
import { DEFAULT_SETTINGS, safeParseSettings } from './defaults';
import type { ClipSettings } from './types';

export const settingsItem = storage.defineItem<ClipSettings>('sync:settings', {
	fallback: DEFAULT_SETTINGS,
	version: 1,
});

export async function getSettings(): Promise<ClipSettings> {
	return safeParseSettings(await settingsItem.getValue());
}
