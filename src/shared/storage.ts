// Thin wrapper around wxt/utils/storage to centralize the patterns this repo
// relied on against the raw `browser.storage.{sync,local}` API. Callers should
// import from here (not from `wxt/utils/storage` directly) so that the
// default-options bag helper stays consistent.

import type { ExtensionStorageArea } from '@/lib/types/extension.ts';
import { storage } from 'wxt/utils/storage';

export { storage };

type StorageArea = 'sync' | 'local' | 'session';

type DefaultsBag = Record<string, unknown>;

type WxtKey = `sync:${string}` | `local:${string}` | `session:${string}` | `managed:${string}`;

/**
 * Fetch every key in `defaults` from the given storage area, overlaying the
 * per-key default for any missing value. Matches the semantics of the old
 * `browser.storage.sync.get(defaultObject)` pattern (which webextension APIs
 * treat as "get these keys and fill misses from the object's values").
 *
 * Returns a fresh object — safe to mutate.
 */
export async function getItemsBag<T extends DefaultsBag>(
	area: StorageArea,
	defaults: T,
): Promise<T> {
	const keys = Object.keys(defaults);
	if (keys.length === 0) {
		return { ...defaults };
	}

	const prefixed = keys.map((k) => `${area}:${k}` as WxtKey);
	const items = await storage.getItems(prefixed);
	const out: Record<string, unknown> = { ...defaults };
	for (const { key, value } of items) {
		const bare = key.replace(/^(sync|local|session):/, '');
		if (value !== null && value !== undefined) {
			out[bare] = value;
		}
	}
	return out as T;
}

/**
 * Fetch a list of keys from a storage area and return them as an object keyed
 * by bare name (no area prefix). Mirrors `browser.storage.X.get(keysArray)`
 * semantics: missing keys come back as `undefined`.
 */
export async function getItemsRecord(
	area: StorageArea,
	keys: readonly string[],
): Promise<Record<string, unknown>> {
	if (keys.length === 0) {
		return {};
	}
	const prefixed = keys.map((k) => `${area}:${k}` as WxtKey);
	const items = await storage.getItems(prefixed);
	const out: Record<string, unknown> = {};
	for (const { key, value } of items) {
		const bare = key.replace(/^(sync|local|session):/, '');
		out[bare] = value ?? undefined;
	}
	return out;
}

/**
 * Webextension-storage-shaped adapter backed by `wxt/utils/storage`. Returns
 * an object whose shape satisfies {@link ExtensionStorageArea}, so callers can
 * swap it in for a raw `browser.storage.local`/`.sync` reference with no
 * downstream changes. `get` accepts the three shapes the webextension API
 * allows — a single key, an array of keys, or a defaults bag.
 */
export function createAreaAdapter(area: StorageArea): ExtensionStorageArea {
	return {
		async get(keys) {
			if (keys == null) {
				// "get everything" isn't supported by wxt/utils/storage directly.
				// In practice no caller in this repo uses this overload, but keep
				// the branch defensive.
				return {};
			}
			if (typeof keys === 'string') {
				return getItemsRecord(area, [keys]);
			}
			if (Array.isArray(keys)) {
				return getItemsRecord(area, keys);
			}
			return getItemsBag(area, keys);
		},
		async set(values) {
			await setItemsBag(area, values);
		},
		async remove(keys) {
			const list = Array.isArray(keys) ? keys : [keys];
			await storage.removeItems(list.map((k) => `${area}:${k}` as WxtKey));
		},
	};
}

/**
 * Set multiple keys in a single call, mirroring `browser.storage.X.set({...})`.
 */
export async function setItemsBag(
	area: StorageArea,
	values: Record<string, unknown>,
): Promise<void> {
	const entries = Object.entries(values).map(([k, value]) => ({
		key: `${area}:${k}` as WxtKey,
		value,
	}));
	if (entries.length === 0) {
		return;
	}
	await storage.setItems(entries);
}
