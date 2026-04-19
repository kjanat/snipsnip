import type { NotificationMetricsDelta } from '@/lib/types/index.ts';

export interface NotificationAction {
	label: string;
	url: string;
}

export interface PendingNotification {
	id: string;
	type: string;
	createdAt: number;
	title: string;
	message: string;
	previousVersion: string | null;
	currentVersion: string | null;
	milestone: number | null;
	highlights: string[];
	primaryAction: NotificationAction | null;
	secondaryAction: NotificationAction | null;
	showCount: number;
	lastShownAt: number | null;
}

export interface NotificationState {
	lastInstalledVersion: string | null;
	successfulExportsCount: number;
	successfulDownloadsCount: number;
	successfulCopiesCount: number;
	successfulObsidianSendsCount: number;
	successfulBatchUrlsCount: number;
	shownSupportThresholds: number[];
	shownUpdateVersions: string[];
	pendingNotifications: PendingNotification[];
}

export interface NotificationConfig {
	previousVersion?: string;
	currentVersion?: string;
	highlights?: string[];
	buyMeACoffeeUrl?: string;
	releaseNotesUrl?: string;
	milestone?: number;
}

export const SUPPORT_NOTIFICATION_THRESHOLDS = Object.freeze([25, 100, 500, 1000, 2500, 5000, 10000]);

export const RELEASES_URL = 'https://github.com/kjanat/snipsnip/releases';

export const BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/dhruvparikh';

export const STORAGE_DEFAULTS: Readonly<NotificationState> = Object.freeze({
	lastInstalledVersion: null,
	successfulExportsCount: 0,
	successfulDownloadsCount: 0,
	successfulCopiesCount: 0,
	successfulObsidianSendsCount: 0,
	successfulBatchUrlsCount: 0,
	shownSupportThresholds: [],
	shownUpdateVersions: [],
	pendingNotifications: [],
});

export const STORAGE_KEYS = Object.freeze(Object.keys(STORAGE_DEFAULTS));

const NOTIFICATION_TYPE_PRIORITY = Object.freeze({
	'version-update': 0,
	'support-milestone': 1,
});

function getNotificationTypePriority(type: string): number {
	if (type === 'version-update' || type === 'support-milestone') {
		return NOTIFICATION_TYPE_PRIORITY[type];
	}

	return 99;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Object.prototype.toString.call(value) === '[object Object]';
}

function toNonNegativeInteger(value: unknown): number {
	const normalized = Number(value);
	if (!Number.isFinite(normalized) || normalized <= 0) {
		return 0;
	}

	return Math.floor(normalized);
}

function normalizeTimestamp(value: unknown): number | null {
	const normalized = Number(value);
	if (!Number.isFinite(normalized) || normalized <= 0) {
		return null;
	}

	return Math.floor(normalized);
}

function normalizeStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
		.map((entry) => entry.trim());
}

function normalizeNumericArray(value: unknown): number[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map(toNonNegativeInteger)
		.filter((entry) => entry > 0);
}

function sanitizeAction(action: unknown): NotificationAction | null {
	if (!isPlainObject(action) || typeof action.url !== 'string' || action.url.trim() === '') {
		return null;
	}

	return {
		label: typeof action.label === 'string' && action.label.trim() !== ''
			? action.label.trim()
			: 'Open link',
		url: action.url.trim(),
	};
}

function sanitizeHighlights(highlights: unknown): string[] {
	if (!Array.isArray(highlights)) {
		return [];
	}

	return highlights
		.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
		.map((entry) => entry.trim())
		.slice(0, 5);
}

function sanitizeNotification(notification: unknown): PendingNotification {
	const source = isPlainObject(notification) ? notification : {};
	const createdAt = normalizeTimestamp(source.createdAt) ?? Date.now();

	return {
		id: typeof source.id === 'string' && source.id.trim() !== ''
			? source.id.trim()
			: `notification:${createdAt}`,
		type: typeof source.type === 'string' ? source.type : 'support-milestone',
		createdAt,
		title: typeof source.title === 'string' ? source.title : '',
		message: typeof source.message === 'string' ? source.message : '',
		previousVersion: typeof source.previousVersion === 'string' ? source.previousVersion : null,
		currentVersion: typeof source.currentVersion === 'string' ? source.currentVersion : null,
		milestone: toNonNegativeInteger(source.milestone) || null,
		highlights: sanitizeHighlights(source.highlights),
		primaryAction: sanitizeAction(source.primaryAction),
		secondaryAction: sanitizeAction(source.secondaryAction),
		showCount: toNonNegativeInteger(source.showCount),
		lastShownAt: normalizeTimestamp(source.lastShownAt),
	};
}

export function ensureNotificationState(rawState: unknown = {}): NotificationState {
	const raw = isPlainObject(rawState) ? rawState : {};

	return {
		lastInstalledVersion: typeof raw.lastInstalledVersion === 'string' && raw.lastInstalledVersion.trim() !== ''
			? raw.lastInstalledVersion.trim()
			: null,
		successfulExportsCount: toNonNegativeInteger(raw.successfulExportsCount),
		successfulDownloadsCount: toNonNegativeInteger(raw.successfulDownloadsCount),
		successfulCopiesCount: toNonNegativeInteger(raw.successfulCopiesCount),
		successfulObsidianSendsCount: toNonNegativeInteger(raw.successfulObsidianSendsCount),
		successfulBatchUrlsCount: toNonNegativeInteger(raw.successfulBatchUrlsCount),
		shownSupportThresholds: normalizeNumericArray(raw.shownSupportThresholds),
		shownUpdateVersions: normalizeStringArray(raw.shownUpdateVersions),
		pendingNotifications: Array.isArray(raw.pendingNotifications)
			? raw.pendingNotifications.map(sanitizeNotification)
			: [],
	};
}

function formatCount(value: unknown): string {
	return new Intl.NumberFormat('en-US').format(toNonNegativeInteger(value));
}

export function hasPendingNotificationType(state: unknown, type: string): boolean {
	return ensureNotificationState(state).pendingNotifications.some((notification) => notification.type === type);
}

export function sortPendingNotifications(notifications: PendingNotification[]): PendingNotification[] {
	return [...notifications].sort((left, right) => {
		const leftPriority = getNotificationTypePriority(left.type);
		const rightPriority = getNotificationTypePriority(right.type);
		if (leftPriority !== rightPriority) {
			return leftPriority - rightPriority;
		}

		return left.createdAt - right.createdAt;
	});
}

export function getNextPendingNotification(state: unknown): PendingNotification | null {
	const nextState = ensureNotificationState(state);
	return sortPendingNotifications(nextState.pendingNotifications)[0] ?? null;
}

export function upsertNotification(state: unknown, notification: unknown): NotificationState {
	const nextState = ensureNotificationState(state);
	const sanitizedNotification = sanitizeNotification(notification);
	const withoutExisting = nextState.pendingNotifications.filter((entry) => entry.id !== sanitizedNotification.id);

	withoutExisting.push(sanitizedNotification);

	return {
		...nextState,
		pendingNotifications: withoutExisting,
	};
}

export function dismissNotification(state: unknown, notificationId: string): NotificationState {
	const nextState = ensureNotificationState(state);

	return {
		...nextState,
		pendingNotifications: nextState.pendingNotifications.filter((entry) => entry.id !== notificationId),
	};
}

export function markNotificationShown(state: unknown, notificationId: string, shownAt?: number): NotificationState {
	const nextState = ensureNotificationState(state);
	const normalizedShownAt = normalizeTimestamp(shownAt) ?? Date.now();

	return {
		...nextState,
		pendingNotifications: nextState.pendingNotifications.map((entry) => {
			if (entry.id !== notificationId) {
				return entry;
			}

			return {
				...entry,
				showCount: entry.showCount + 1,
				lastShownAt: normalizedShownAt,
			};
		}),
	};
}

export function createVersionUpdateNotification(config: NotificationConfig = {}): PendingNotification {
	const previousVersion = typeof config.previousVersion === 'string' ? config.previousVersion : null;
	const currentVersion = typeof config.currentVersion === 'string' ? config.currentVersion : null;

	return sanitizeNotification({
		id: `version-update:${currentVersion}`,
		type: 'version-update',
		createdAt: Date.now(),
		title: `SnipSnip updated to v${currentVersion}`,
		message: previousVersion !== null
			? `Updated from v${previousVersion} to v${currentVersion}.`
			: `SnipSnip updated to v${currentVersion}.`,
		previousVersion,
		currentVersion,
		highlights: sanitizeHighlights(config.highlights),
		primaryAction: {
			label: 'Buy Me a Coffee',
			url: config.buyMeACoffeeUrl ?? BUY_ME_A_COFFEE_URL,
		},
		secondaryAction: {
			label: 'View release notes',
			url: config.releaseNotesUrl ?? RELEASES_URL,
		},
	});
}

export function createSupportNotification(config: NotificationConfig = {}): PendingNotification {
	const milestone = toNonNegativeInteger(config.milestone);
	const formattedMilestone = formatCount(milestone);

	return sanitizeNotification({
		id: `support-milestone:${milestone}`,
		type: 'support-milestone',
		createdAt: Date.now(),
		title: `${formattedMilestone} pages exported`,
		message:
			`SnipSnip has helped export over ${formattedMilestone} pages. If it has been useful, support ongoing development.`,
		milestone,
		primaryAction: {
			label: 'Buy Me a Coffee',
			url: config.buyMeACoffeeUrl ?? BUY_ME_A_COFFEE_URL,
		},
		secondaryAction: {
			label: 'View release notes',
			url: config.releaseNotesUrl ?? RELEASES_URL,
		},
	});
}

export function queueVersionUpdate(state: unknown, config: NotificationConfig = {}): NotificationState {
	const nextState = ensureNotificationState(state);
	const currentVersion = typeof config.currentVersion === 'string' ? config.currentVersion : null;

	if (currentVersion === null || nextState.shownUpdateVersions.includes(currentVersion)) {
		return nextState;
	}

	const withTrackedVersion = {
		...nextState,
		shownUpdateVersions: [...nextState.shownUpdateVersions, currentVersion],
	};

	return upsertNotification(withTrackedVersion, createVersionUpdateNotification(config));
}

export function applyMetricDelta(state: unknown, delta: NotificationMetricsDelta = {}): NotificationState {
	const nextState = ensureNotificationState(state);

	return {
		...nextState,
		successfulExportsCount: nextState.successfulExportsCount + toNonNegativeInteger(delta.exports),
		successfulDownloadsCount: nextState.successfulDownloadsCount + toNonNegativeInteger(delta.downloads),
		successfulCopiesCount: nextState.successfulCopiesCount + toNonNegativeInteger(delta.copies),
		successfulObsidianSendsCount: nextState.successfulObsidianSendsCount + toNonNegativeInteger(delta.obsidianSends),
		successfulBatchUrlsCount: nextState.successfulBatchUrlsCount + toNonNegativeInteger(delta.batchUrls),
	};
}

export function getNextSupportThreshold(state: unknown): number | null {
	const nextState = ensureNotificationState(state);

	for (const threshold of SUPPORT_NOTIFICATION_THRESHOLDS) {
		if (nextState.successfulExportsCount >= threshold && !nextState.shownSupportThresholds.includes(threshold)) {
			return threshold;
		}
	}

	return null;
}

export function queueNextSupportNotification(state: unknown, config: NotificationConfig = {}): NotificationState {
	const nextState = ensureNotificationState(state);

	if (hasPendingNotificationType(nextState, 'support-milestone')) {
		return nextState;
	}

	const nextThreshold = getNextSupportThreshold(nextState);
	if (nextThreshold === null) {
		return nextState;
	}

	const withTrackedThreshold = {
		...nextState,
		shownSupportThresholds: [...nextState.shownSupportThresholds, nextThreshold],
	};

	return upsertNotification(
		withTrackedThreshold,
		createSupportNotification({
			...config,
			milestone: nextThreshold,
		}),
	);
}

const notifications = {
	BUY_ME_A_COFFEE_URL,
	RELEASES_URL,
	STORAGE_DEFAULTS,
	STORAGE_KEYS,
	SUPPORT_NOTIFICATION_THRESHOLDS,
	applyMetricDelta,
	createSupportNotification,
	createVersionUpdateNotification,
	dismissNotification,
	ensureNotificationState,
	getNextPendingNotification,
	getNextSupportThreshold,
	hasPendingNotificationType,
	markNotificationShown,
	queueNextSupportNotification,
	queueVersionUpdate,
	sortPendingNotifications,
	upsertNotification,
};

export default notifications;
