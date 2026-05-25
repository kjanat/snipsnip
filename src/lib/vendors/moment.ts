import type { MomentApi } from '@/lib/types/extension.ts';
import moment from 'moment';

globalThis.moment = moment as unknown as MomentApi;

export function getMomentApi(): MomentApi {
	return globalThis.moment as MomentApi;
}

export async function loadMomentApi(): Promise<MomentApi> {
	return globalThis.moment as MomentApi;
}
