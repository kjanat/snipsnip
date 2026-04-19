// GENERATED from notifications.ts. Edit the TypeScript source only.
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

		// src/shared/notifications.ts
		var exports_notifications = {};
		__export(exports_notifications, {
			upsertNotification: () => upsertNotification,
			sortPendingNotifications: () => sortPendingNotifications,
			queueVersionUpdate: () => queueVersionUpdate,
			queueNextSupportNotification: () => queueNextSupportNotification,
			markNotificationShown: () => markNotificationShown,
			hasPendingNotificationType: () => hasPendingNotificationType,
			getNextSupportThreshold: () => getNextSupportThreshold,
			getNextPendingNotification: () => getNextPendingNotification,
			ensureNotificationState: () => ensureNotificationState,
			dismissNotification: () => dismissNotification,
			default: () => notifications_default,
			createVersionUpdateNotification: () => createVersionUpdateNotification,
			createSupportNotification: () => createSupportNotification,
			applyMetricDelta: () => applyMetricDelta,
			SUPPORT_NOTIFICATION_THRESHOLDS: () => SUPPORT_NOTIFICATION_THRESHOLDS,
			STORAGE_KEYS: () => STORAGE_KEYS,
			STORAGE_DEFAULTS: () => STORAGE_DEFAULTS,
			RELEASES_URL: () => RELEASES_URL,
			BUY_ME_A_COFFEE_URL: () => BUY_ME_A_COFFEE_URL,
		});
		module.exports = __toCommonJS(exports_notifications);
		var SUPPORT_NOTIFICATION_THRESHOLDS = Object.freeze([25, 100, 500, 1000, 2500, 5000, 1e4]);
		var RELEASES_URL = 'https://github.com/kjanat/snipsnip/releases';
		var BUY_ME_A_COFFEE_URL = 'https://buymeacoffee.com/dhruvparikh';
		var STORAGE_DEFAULTS = Object.freeze({
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
		var STORAGE_KEYS = Object.freeze(Object.keys(STORAGE_DEFAULTS));
		var NOTIFICATION_TYPE_PRIORITY = Object.freeze({
			'version-update': 0,
			'support-milestone': 1,
		});
		function getNotificationTypePriority(type) {
			if (type === 'version-update' || type === 'support-milestone') {
				return NOTIFICATION_TYPE_PRIORITY[type];
			}
			return 99;
		}
		function isPlainObject(value) {
			return Object.prototype.toString.call(value) === '[object Object]';
		}
		function toNonNegativeInteger(value) {
			const normalized = Number(value);
			if (!Number.isFinite(normalized) || normalized <= 0) {
				return 0;
			}
			return Math.floor(normalized);
		}
		function normalizeTimestamp(value) {
			const normalized = Number(value);
			if (!Number.isFinite(normalized) || normalized <= 0) {
				return null;
			}
			return Math.floor(normalized);
		}
		function normalizeStringArray(value) {
			if (!Array.isArray(value)) {
				return [];
			}
			return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim());
		}
		function normalizeNumericArray(value) {
			if (!Array.isArray(value)) {
				return [];
			}
			return value.map(toNonNegativeInteger).filter((entry) => entry > 0);
		}
		function sanitizeAction(action) {
			if (!isPlainObject(action) || typeof action.url !== 'string' || action.url.trim() === '') {
				return null;
			}
			return {
				label: typeof action.label === 'string' && action.label.trim() !== '' ? action.label.trim() : 'Open link',
				url: action.url.trim(),
			};
		}
		function sanitizeHighlights(highlights) {
			if (!Array.isArray(highlights)) {
				return [];
			}
			return highlights.filter((entry) => typeof entry === 'string' && entry.trim().length > 0).map((entry) =>
				entry.trim()
			).slice(0, 5);
		}
		function sanitizeNotification(notification) {
			const source = isPlainObject(notification) ? notification : {};
			const createdAt = normalizeTimestamp(source.createdAt) ?? Date.now();
			return {
				id: typeof source.id === 'string' && source.id.trim() !== '' ? source.id.trim() : `notification:${createdAt}`,
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
		function ensureNotificationState(rawState = {}) {
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
		function formatCount(value) {
			return new Intl.NumberFormat('en-US').format(toNonNegativeInteger(value));
		}
		function hasPendingNotificationType(state, type) {
			return ensureNotificationState(state).pendingNotifications.some((notification) => notification.type === type);
		}
		function sortPendingNotifications(notifications) {
			return [...notifications].sort((left, right) => {
				const leftPriority = getNotificationTypePriority(left.type);
				const rightPriority = getNotificationTypePriority(right.type);
				if (leftPriority !== rightPriority) {
					return leftPriority - rightPriority;
				}
				return left.createdAt - right.createdAt;
			});
		}
		function getNextPendingNotification(state) {
			const nextState = ensureNotificationState(state);
			return sortPendingNotifications(nextState.pendingNotifications)[0] ?? null;
		}
		function upsertNotification(state, notification) {
			const nextState = ensureNotificationState(state);
			const sanitizedNotification = sanitizeNotification(notification);
			const withoutExisting = nextState.pendingNotifications.filter((entry) => entry.id !== sanitizedNotification.id);
			withoutExisting.push(sanitizedNotification);
			return {
				...nextState,
				pendingNotifications: withoutExisting,
			};
		}
		function dismissNotification(state, notificationId) {
			const nextState = ensureNotificationState(state);
			return {
				...nextState,
				pendingNotifications: nextState.pendingNotifications.filter((entry) => entry.id !== notificationId),
			};
		}
		function markNotificationShown(state, notificationId, shownAt) {
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
		function createVersionUpdateNotification(config = {}) {
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
		function createSupportNotification(config = {}) {
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
		function queueVersionUpdate(state, config = {}) {
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
		function applyMetricDelta(state, delta = {}) {
			const nextState = ensureNotificationState(state);
			return {
				...nextState,
				successfulExportsCount: nextState.successfulExportsCount + toNonNegativeInteger(delta.exports),
				successfulDownloadsCount: nextState.successfulDownloadsCount + toNonNegativeInteger(delta.downloads),
				successfulCopiesCount: nextState.successfulCopiesCount + toNonNegativeInteger(delta.copies),
				successfulObsidianSendsCount: nextState.successfulObsidianSendsCount
					+ toNonNegativeInteger(delta.obsidianSends),
				successfulBatchUrlsCount: nextState.successfulBatchUrlsCount + toNonNegativeInteger(delta.batchUrls),
			};
		}
		function getNextSupportThreshold(state) {
			const nextState = ensureNotificationState(state);
			for (const threshold of SUPPORT_NOTIFICATION_THRESHOLDS) {
				if (nextState.successfulExportsCount >= threshold && !nextState.shownSupportThresholds.includes(threshold)) {
					return threshold;
				}
			}
			return null;
		}
		function queueNextSupportNotification(state, config = {}) {
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
		var notifications = {
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
		var notifications_default = notifications;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipNotifications = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
