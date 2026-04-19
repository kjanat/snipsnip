// GENERATED from agent-bridge-state.ts. Edit the TypeScript source only.
(function(root) {
	const exported = (() => {
		const module = { exports: {} };
		var __defProp = Object.defineProperty;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		function __accessProp(key) {
			return this[key];
		}
		var __toCommonJS = (from) => {
			var entry = (__moduleCache ??= new WeakMap()).get(from), desc;
			if (entry) {
				return entry;
			}
			entry = __defProp({}, '__esModule', { value: true });
			if (from && typeof from === 'object' || typeof from === 'function') {
				for (var key of __getOwnPropNames(from)) {
					if (!__hasOwnProp.call(entry, key)) {
						__defProp(entry, key, {
							get: __accessProp.bind(from, key),
							enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
						});
					}
				}
			}
			__moduleCache.set(from, entry);
			return entry;
		};
		var __moduleCache;
		var __returnValue = (v) => v;
		function __exportSetter(name, newValue) {
			this[name] = __returnValue.bind(null, newValue);
		}
		var __export = (target, all) => {
			for (var name in all) {
				__defProp(target, name, {
					get: all[name],
					enumerable: true,
					configurable: true,
					set: __exportSetter.bind(all, name),
				});
			}
		};

		// src/shared/agent-bridge-state.ts
		var exports_agent_bridge_state = {};
		__export(exports_agent_bridge_state, {
			shouldUseLatestClipForPage: () => shouldUseLatestClipForPage,
			saveStatus: () => saveStatus,
			saveSettings: () => saveSettings,
			saveLatestClip: () => saveLatestClip,
			normalizeStatus: () => normalizeStatus,
			normalizeSettings: () => normalizeSettings,
			normalizePageUrl: () => normalizePageUrl,
			normalizeLatestClip: () => normalizeLatestClip,
			loadStatus: () => loadStatus,
			loadSettings: () => loadSettings,
			loadLatestClip: () => loadLatestClip,
			hasUsableLatestClip: () => hasUsableLatestClip,
			default: () => agent_bridge_state_default,
			clearLatestClip: () => clearLatestClip,
			STORAGE_KEYS: () => STORAGE_KEYS,
			DEFAULT_STATUS: () => DEFAULT_STATUS,
			DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
			DEFAULT_LATEST_CLIP: () => DEFAULT_LATEST_CLIP,
		});
		module.exports = __toCommonJS(exports_agent_bridge_state);
		var STORAGE_KEYS = Object.freeze({
			SETTINGS: 'agentBridgeSettings',
			STATUS: 'agentBridgeStatus',
			LATEST_CLIP: 'bridgeLatestClip',
		});
		var DEFAULT_SETTINGS = Object.freeze({
			enabled: false,
		});
		var DEFAULT_STATUS = Object.freeze({
			enabled: false,
			permissionGranted: false,
			connecting: false,
			connected: false,
			hostInstalled: false,
			browser: '',
			hostVersion: '',
			lastError: '',
			updatedAt: '',
		});
		var DEFAULT_LATEST_CLIP = Object.freeze({
			title: '',
			markdown: '',
			pageUrl: '',
			normalizedPageUrl: '',
			updatedAt: '',
			source: 'popup',
		});
		function getDefaultStorage() {
			return globalThis.browser?.storage?.local;
		}
		function isPlainObject(value) {
			return Object.prototype.toString.call(value) === '[object Object]';
		}
		function normalizePageUrl(url = '') {
			if (typeof url !== 'string' || url === '') {
				return '';
			}
			try {
				const parsed = new URL(url);
				parsed.hash = '';
				return parsed.href;
			} catch {
				return url.trim();
			}
		}
		function normalizeSettings(settings = {}) {
			const normalizedSettings = isPlainObject(settings) ? settings : {};
			return {
				enabled: normalizedSettings.enabled === true,
			};
		}
		function normalizeStatus(status = {}) {
			const normalizedStatus = isPlainObject(status) ? status : {};
			return {
				enabled: normalizedStatus.enabled === true,
				permissionGranted: normalizedStatus.permissionGranted === true,
				connecting: normalizedStatus.connecting === true,
				connected: normalizedStatus.connected === true,
				hostInstalled: normalizedStatus.hostInstalled === true,
				browser: typeof normalizedStatus.browser === 'string' ? normalizedStatus.browser.trim().toLowerCase() : '',
				hostVersion: typeof normalizedStatus.hostVersion === 'string' ? normalizedStatus.hostVersion.trim() : '',
				lastError: typeof normalizedStatus.lastError === 'string' ? normalizedStatus.lastError.trim() : '',
				updatedAt: typeof normalizedStatus.updatedAt === 'string' ? normalizedStatus.updatedAt.trim() : '',
			};
		}
		function normalizeLatestClip(snapshot = {}) {
			const normalizedSnapshot = isPlainObject(snapshot) ? snapshot : {};
			const pageUrl = String(normalizedSnapshot.pageUrl ?? '').trim();
			const explicitNormalizedPageUrl = typeof normalizedSnapshot.normalizedPageUrl === 'string'
				? normalizedSnapshot.normalizedPageUrl
				: pageUrl;
			const normalizedPageUrl = normalizePageUrl(explicitNormalizedPageUrl);
			return {
				title: String(normalizedSnapshot.title ?? '').trim(),
				markdown: String(normalizedSnapshot.markdown ?? ''),
				pageUrl,
				normalizedPageUrl,
				updatedAt: typeof normalizedSnapshot.updatedAt === 'string' && normalizedSnapshot.updatedAt.trim() !== ''
					? normalizedSnapshot.updatedAt.trim()
					: new Date().toISOString(),
				source: 'popup',
			};
		}
		function hasUsableLatestClip(snapshot = {}) {
			const clip = normalizeLatestClip(snapshot);
			return clip.normalizedPageUrl !== '' && clip.markdown.trim() !== '';
		}
		function shouldUseLatestClipForPage(snapshot = {}, pageUrl = '') {
			if (!hasUsableLatestClip(snapshot)) {
				return false;
			}
			return normalizeLatestClip(snapshot).normalizedPageUrl === normalizePageUrl(pageUrl);
		}
		async function loadSettings(storage = getDefaultStorage()) {
			if (storage?.get == null) {
				return normalizeSettings();
			}
			const stored = await storage.get(STORAGE_KEYS.SETTINGS);
			return normalizeSettings(stored[STORAGE_KEYS.SETTINGS]);
		}
		async function saveSettings(settings, storage = getDefaultStorage()) {
			const normalized = normalizeSettings(settings);
			if (storage?.set != null) {
				await storage.set({ [STORAGE_KEYS.SETTINGS]: normalized });
			}
			return normalized;
		}
		async function loadStatus(storage = getDefaultStorage()) {
			if (storage?.get == null) {
				return normalizeStatus();
			}
			const stored = await storage.get(STORAGE_KEYS.STATUS);
			return normalizeStatus(stored[STORAGE_KEYS.STATUS]);
		}
		async function saveStatus(status, storage = getDefaultStorage()) {
			const normalized = normalizeStatus(status);
			if (storage?.set != null) {
				await storage.set({ [STORAGE_KEYS.STATUS]: normalized });
			}
			return normalized;
		}
		async function loadLatestClip(storage = getDefaultStorage()) {
			if (storage?.get == null) {
				return normalizeLatestClip(DEFAULT_LATEST_CLIP);
			}
			const stored = await storage.get(STORAGE_KEYS.LATEST_CLIP);
			return normalizeLatestClip(stored[STORAGE_KEYS.LATEST_CLIP]);
		}
		async function saveLatestClip(snapshot, storage = getDefaultStorage()) {
			const normalized = normalizeLatestClip(snapshot);
			if (storage?.set != null) {
				await storage.set({ [STORAGE_KEYS.LATEST_CLIP]: normalized });
			}
			return normalized;
		}
		async function clearLatestClip(storage = getDefaultStorage()) {
			if (storage?.remove != null) {
				await storage.remove(STORAGE_KEYS.LATEST_CLIP);
			}
			return normalizeLatestClip(DEFAULT_LATEST_CLIP);
		}
		var agentBridgeState = {
			STORAGE_KEYS,
			DEFAULT_SETTINGS,
			DEFAULT_STATUS,
			DEFAULT_LATEST_CLIP,
			normalizePageUrl,
			normalizeSettings,
			normalizeStatus,
			normalizeLatestClip,
			hasUsableLatestClip,
			shouldUseLatestClipForPage,
			loadSettings,
			saveSettings,
			loadStatus,
			saveStatus,
			loadLatestClip,
			saveLatestClip,
			clearLatestClip,
		};
		var agent_bridge_state_default = agentBridgeState;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipAgentBridgeState = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
