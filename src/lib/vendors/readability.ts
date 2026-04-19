import type { ReadabilityApi } from '@/lib/types/index.ts';
import { Readability } from '@mozilla/readability';

globalThis.Readability = Readability as unknown as ReadabilityApi;

export function getReadabilityApi(): ReadabilityApi {
	return globalThis.Readability as ReadabilityApi;
}

export async function loadReadabilityApi(): Promise<ReadabilityApi> {
	return globalThis.Readability as ReadabilityApi;
}
