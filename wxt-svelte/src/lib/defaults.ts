import * as v from 'valibot';
import { type ClipSettings, ClipSettingsSchema } from './types';

export const DEFAULT_SETTINGS: ClipSettings = v.parse(ClipSettingsSchema, {});

export function parseSettings(input: unknown): ClipSettings {
	return v.parse(ClipSettingsSchema, input ?? {});
}

export function safeParseSettings(input: unknown): ClipSettings {
	const result = v.safeParse(ClipSettingsSchema, input ?? {});
	return result.success ? result.output : DEFAULT_SETTINGS;
}
