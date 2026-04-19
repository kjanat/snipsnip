(function(root) {
	function createDownloadTracker(options = {}) {
		const activeDownloads = options.activeDownloads || new Map();
		const snipSnipDownloads = options.snipSnipDownloads || new Map();
		const snipSnipUrls = options.snipSnipUrls || new Map();
		const snipSnipBlobUrls = options.snipSnipBlobUrls || new Set();
		const sendCleanupBlobUrl = typeof options.sendCleanupBlobUrl === 'function'
			? options.sendCleanupBlobUrl
			: () => Promise.resolve();

		function getState() {
			return {
				activeDownloads,
				snipSnipDownloads,
				snipSnipUrls,
				snipSnipBlobUrls,
			};
		}

		function trackUrl(url, info = {}) {
			if (!url) return;
			snipSnipUrls.set(url, { ...info });
			if (url.startsWith('blob:')) {
				snipSnipBlobUrls.add(url);
			}
		}

		function setActiveDownload(downloadId, url) {
			activeDownloads.set(downloadId, url);
		}

		function moveTrackedUrlToDownloadId(downloadId, url) {
			if (!url || !snipSnipUrls.has(url)) {
				return null;
			}

			const urlInfo = snipSnipUrls.get(url);
			snipSnipDownloads.set(downloadId, {
				...urlInfo,
				url,
			});
			snipSnipUrls.delete(url);
			return snipSnipDownloads.get(downloadId);
		}

		function trackDownload(downloadId, info = {}) {
			snipSnipDownloads.set(downloadId, { ...info });
		}

		function handleDownloadComplete(message = {}) {
			const { downloadId, url } = message;
			if (!downloadId || !url) {
				return;
			}

			setActiveDownload(downloadId, url);
			moveTrackedUrlToDownloadId(downloadId, url);
		}

		function cleanupTrackedDownload(downloadId, url, downloadInfo) {
			if (url && url.startsWith('blob:chrome-extension://')) {
				sendCleanupBlobUrl(url);
			}

			activeDownloads.delete(downloadId);
			snipSnipDownloads.delete(downloadId);

			if (url) {
				snipSnipBlobUrls.delete(url);
			}

			if (downloadInfo?.url && snipSnipUrls.has(downloadInfo.url)) {
				snipSnipUrls.delete(downloadInfo.url);
			} else if (url && snipSnipUrls.has(url)) {
				snipSnipUrls.delete(url);
			}
		}

		async function handleDownloadChange(delta, deps = {}) {
			if (!delta?.state) {
				return;
			}

			const downloadInfo = snipSnipDownloads.get(delta.id);
			const url = activeDownloads.get(delta.id) || downloadInfo?.url || null;

			if (delta.state.current === 'complete') {
				deps.logComplete?.(delta.id);
				if (downloadInfo?.notificationDelta && typeof deps.recordNotificationMetrics === 'function') {
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
			const trackedById = snipSnipDownloads.has(downloadItem.id);
			const trackedByUrl = downloadItem.url && snipSnipUrls.has(downloadItem.url);
			const isOurBlobUrl = downloadItem.url && snipSnipBlobUrls.has(downloadItem.url);

			if (trackedById || trackedByUrl || isOurBlobUrl) {
				let filename = null;

				if (trackedById) {
					filename = snipSnipDownloads.get(downloadItem.id)?.filename;
				} else if (trackedByUrl) {
					filename = snipSnipUrls.get(downloadItem.url)?.filename;
				} else if (isOurBlobUrl) {
					filename = snipSnipUrls.get(downloadItem.url)?.filename;
				}

				if (filename) {
					suggest({
						filename,
						conflictAction: 'uniquify',
					});
					return true;
				}
			}

			return false;
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

	const api = { createDownloadTracker };
	root.snipSnipDownloadTracker = api;

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = api;
	}
})(typeof globalThis !== 'undefined' ? globalThis : this);
