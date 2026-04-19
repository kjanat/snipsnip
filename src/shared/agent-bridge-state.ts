import type {
	AgentBridgeLatestClip,
	AgentBridgeSettings,
	AgentBridgeStatus,
	ExtensionStorageArea,
} from '@/lib/types/index.ts';

export const STORAGE_KEYS = Object.freeze({
	SETTINGS: 'agentBridgeSettings',
	STATUS: 'agentBridgeStatus',
	LATEST_CLIP: 'bridgeLatestClip',
});

export const DEFAULT_SETTINGS: Readonly<AgentBridgeSettings> = Object.freeze({
	enabled: false,
});

export const DEFAULT_STATUS: Readonly<AgentBridgeStatus> = Object.freeze({
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

export const DEFAULT_LATEST_CLIP: Readonly<AgentBridgeLatestClip> = Object.freeze({
	title: '',
	markdown: '',
	pageUrl: '',
	normalizedPageUrl: '',
	updatedAt: '',
	source: 'popup',
});

function getDefaultStorage(): ExtensionStorageArea | undefined {
	return browser?.storage?.local;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

export function normalizePageUrl(url = ''): string {
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

export function normalizeSettings(settings: Partial<AgentBridgeSettings> | unknown = {}): AgentBridgeSettings {
	const normalizedSettings = isPlainObject(settings) ? settings : {};
	return {
		enabled: normalizedSettings.enabled === true,
	};
}

export function normalizeStatus(status: Partial<AgentBridgeStatus> | unknown = {}): AgentBridgeStatus {
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

export function normalizeLatestClip(snapshot: Partial<AgentBridgeLatestClip> | unknown = {}): AgentBridgeLatestClip {
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

export function hasUsableLatestClip(snapshot: Partial<AgentBridgeLatestClip> | unknown = {}): boolean {
	const clip = normalizeLatestClip(snapshot);
	return clip.normalizedPageUrl !== '' && clip.markdown.trim() !== '';
}

export function shouldUseLatestClipForPage(
	snapshot: Partial<AgentBridgeLatestClip> | unknown = {},
	pageUrl = '',
): boolean {
	if (!hasUsableLatestClip(snapshot)) {
		return false;
	}

	return normalizeLatestClip(snapshot).normalizedPageUrl === normalizePageUrl(pageUrl);
}

export async function loadSettings(storage = getDefaultStorage()): Promise<AgentBridgeSettings> {
	if (storage?.get == null) {
		return normalizeSettings();
	}

	const stored = await storage.get(STORAGE_KEYS.SETTINGS);
	return normalizeSettings(stored[STORAGE_KEYS.SETTINGS]);
}

export async function saveSettings(
	settings: Partial<AgentBridgeSettings>,
	storage = getDefaultStorage(),
): Promise<AgentBridgeSettings> {
	const normalized = normalizeSettings(settings);
	if (storage?.set != null) {
		await storage.set({ [STORAGE_KEYS.SETTINGS]: normalized });
	}

	return normalized;
}

export async function loadStatus(storage = getDefaultStorage()): Promise<AgentBridgeStatus> {
	if (storage?.get == null) {
		return normalizeStatus();
	}

	const stored = await storage.get(STORAGE_KEYS.STATUS);
	return normalizeStatus(stored[STORAGE_KEYS.STATUS]);
}

export async function saveStatus(
	status: Partial<AgentBridgeStatus>,
	storage = getDefaultStorage(),
): Promise<AgentBridgeStatus> {
	const normalized = normalizeStatus(status);
	if (storage?.set != null) {
		await storage.set({ [STORAGE_KEYS.STATUS]: normalized });
	}

	return normalized;
}

export async function loadLatestClip(storage = getDefaultStorage()): Promise<AgentBridgeLatestClip> {
	if (storage?.get == null) {
		return normalizeLatestClip(DEFAULT_LATEST_CLIP);
	}

	const stored = await storage.get(STORAGE_KEYS.LATEST_CLIP);
	return normalizeLatestClip(stored[STORAGE_KEYS.LATEST_CLIP]);
}

export async function saveLatestClip(
	snapshot: Partial<AgentBridgeLatestClip>,
	storage = getDefaultStorage(),
): Promise<AgentBridgeLatestClip> {
	const normalized = normalizeLatestClip(snapshot);
	if (storage?.set != null) {
		await storage.set({ [STORAGE_KEYS.LATEST_CLIP]: normalized });
	}

	return normalized;
}

export async function clearLatestClip(storage = getDefaultStorage()): Promise<AgentBridgeLatestClip> {
	if (storage?.remove != null) {
		await storage.remove(STORAGE_KEYS.LATEST_CLIP);
	}

	return normalizeLatestClip(DEFAULT_LATEST_CLIP);
}

const agentBridgeState = {
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

export default agentBridgeState;
