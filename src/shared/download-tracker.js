// GENERATED from download-tracker.ts. Edit the TypeScript source only.
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

		// src/shared/download-tracker.ts
		var exports_download_tracker = {};
		__export(exports_download_tracker, {
			default: () => download_tracker_default,
			createDownloadTracker: () => createDownloadTracker,
		});
		module.exports = __toCommonJS(exports_download_tracker);
		function createDownloadTracker(options = {}) {
			const activeDownloads = options.activeDownloads ?? new Map();
			const snipSnipDownloads = options.snipSnipDownloads ?? new Map();
			const snipSnipUrls = options.snipSnipUrls ?? new Map();
			const snipSnipBlobUrls = options.snipSnipBlobUrls ?? new Set();
			const sendCleanupBlobUrl = typeof options.sendCleanupBlobUrl === 'function'
				? options.sendCleanupBlobUrl
				: async () => {};
			function getState() {
				return {
					activeDownloads,
					snipSnipDownloads,
					snipSnipUrls,
					snipSnipBlobUrls,
				};
			}
			function trackUrl(url, info = {}) {
				if (url === '') {
					return;
				}
				snipSnipUrls.set(url, { ...info });
				if (url.startsWith('blob:')) {
					snipSnipBlobUrls.add(url);
				}
			}
			function setActiveDownload(downloadId, url) {
				activeDownloads.set(downloadId, url);
			}
			function moveTrackedUrlToDownloadId(downloadId, url) {
				const urlInfo = snipSnipUrls.get(url);
				if (urlInfo == null) {
					return null;
				}
				snipSnipDownloads.set(downloadId, {
					...urlInfo,
					url,
				});
				snipSnipUrls.delete(url);
				return snipSnipDownloads.get(downloadId) ?? null;
			}
			function trackDownload(downloadId, info = {}) {
				snipSnipDownloads.set(downloadId, { ...info });
			}
			function handleDownloadComplete(message = {}) {
				const { downloadId, url } = message;
				if (typeof downloadId !== 'number' || typeof url !== 'string' || url === '') {
					return;
				}
				setActiveDownload(downloadId, url);
				moveTrackedUrlToDownloadId(downloadId, url);
			}
			function cleanupTrackedDownload(downloadId, url, downloadInfo) {
				if (typeof url === 'string' && url.startsWith('blob:chrome-extension://')) {
					sendCleanupBlobUrl(url);
				}
				activeDownloads.delete(downloadId);
				snipSnipDownloads.delete(downloadId);
				if (typeof url === 'string') {
					snipSnipBlobUrls.delete(url);
				}
				if (typeof downloadInfo?.url === 'string' && snipSnipUrls.has(downloadInfo.url)) {
					snipSnipUrls.delete(downloadInfo.url);
				} else if (typeof url === 'string' && snipSnipUrls.has(url)) {
					snipSnipUrls.delete(url);
				}
			}
			async function handleDownloadChange(delta, deps = {}) {
				if (delta.state == null) {
					return;
				}
				const downloadInfo = snipSnipDownloads.get(delta.id);
				const url = activeDownloads.get(delta.id) ?? downloadInfo?.url ?? null;
				if (delta.state.current === 'complete') {
					deps.logComplete?.(delta.id);
					if (downloadInfo?.notificationDelta != null && typeof deps.recordNotificationMetrics === 'function') {
						try {
							await deps.recordNotificationMetrics(downloadInfo.notificationDelta, downloadInfo.tabId);
						} catch (error) {
							deps.onMetricsError?.(error);
						}
					}
					cleanupTrackedDownload(delta.id, url, downloadInfo);
					return;
				}
				if (delta.state.current === 'interrupted') {
					deps.logInterrupted?.(delta.id, delta.error);
					cleanupTrackedDownload(delta.id, url, downloadInfo);
				}
			}
			function handleFilenameConflict(downloadItem, suggest) {
				const url = typeof downloadItem.url === 'string' ? downloadItem.url : null;
				const trackedById = snipSnipDownloads.has(downloadItem.id);
				const trackedByUrl = url !== null && snipSnipUrls.has(url);
				const isOurBlobUrl = url !== null && snipSnipBlobUrls.has(url);
				if (!trackedById && !trackedByUrl && !isOurBlobUrl) {
					return false;
				}
				let filename;
				if (trackedById) {
					filename = snipSnipDownloads.get(downloadItem.id)?.filename;
				} else if (trackedByUrl && url !== null) {
					filename = snipSnipUrls.get(url)?.filename;
				} else if (isOurBlobUrl && url !== null) {
					filename = snipSnipUrls.get(url)?.filename;
				}
				if (typeof filename !== 'string' || filename === '') {
					return false;
				}
				suggest({
					filename,
					conflictAction: 'uniquify',
				});
				return true;
			}
			return {
				getState,
				trackUrl,
				setActiveDownload,
				moveTrackedUrlToDownloadId,
				trackDownload,
				handleDownloadComplete,
				cleanupTrackedDownload,
				handleDownloadChange,
				handleFilenameConflict,
			};
		}
		var downloadTracker = { createDownloadTracker };
		var download_tracker_default = downloadTracker;

		return module.exports;
	})();
	const api = exported.default ?? exported;
	root.snipSnipDownloadTracker = api;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
