import type { DownloadChangeDeps, DownloadTrackerApi, DownloadTrackerState, DownloadTrackingInfo } from '@/lib/types';

interface CreateDownloadTrackerOptions {
	activeDownloads?: Map<number, string>;
	snipSnipDownloads?: Map<number, DownloadTrackingInfo>;
	snipSnipUrls?: Map<string, DownloadTrackingInfo>;
	snipSnipBlobUrls?: Set<string>;
	sendCleanupBlobUrl?: (url: string) => Promise<void>;
}

export function createDownloadTracker(options: CreateDownloadTrackerOptions = {}): DownloadTrackerApi {
	const activeDownloads = options.activeDownloads ?? new Map<number, string>();
	const snipSnipDownloads = options.snipSnipDownloads ?? new Map<number, DownloadTrackingInfo>();
	const snipSnipUrls = options.snipSnipUrls ?? new Map<string, DownloadTrackingInfo>();
	const snipSnipBlobUrls = options.snipSnipBlobUrls ?? new Set<string>();
	const sendCleanupBlobUrl = typeof options.sendCleanupBlobUrl === 'function'
		? options.sendCleanupBlobUrl
		: async () => {};

	function getState(): DownloadTrackerState {
		return {
			activeDownloads,
			snipSnipDownloads,
			snipSnipUrls,
			snipSnipBlobUrls,
		};
	}

	function trackUrl(url: string, info: DownloadTrackingInfo = {}): void {
		if (url === '') {
			return;
		}

		snipSnipUrls.set(url, { ...info });
		if (url.startsWith('blob:')) {
			snipSnipBlobUrls.add(url);
		}
	}

	function setActiveDownload(downloadId: number, url: string): void {
		activeDownloads.set(downloadId, url);
	}

	function moveTrackedUrlToDownloadId(downloadId: number, url: string): DownloadTrackingInfo | null {
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

	function trackDownload(downloadId: number, info: DownloadTrackingInfo = {}): void {
		snipSnipDownloads.set(downloadId, { ...info });
	}

	function handleDownloadComplete(message: { downloadId?: number; url?: string } = {}): void {
		const { downloadId, url } = message;
		if (typeof downloadId !== 'number' || typeof url !== 'string' || url === '') {
			return;
		}

		setActiveDownload(downloadId, url);
		moveTrackedUrlToDownloadId(downloadId, url);
	}

	function cleanupTrackedDownload(downloadId: number, url?: string | null, downloadInfo?: DownloadTrackingInfo): void {
		if (typeof url === 'string' && url.startsWith('blob:chrome-extension://')) {
			void sendCleanupBlobUrl(url);
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

	async function handleDownloadChange(
		delta: { id: number; state?: { current?: string }; error?: unknown },
		deps: DownloadChangeDeps = {},
	): Promise<void> {
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

	function handleFilenameConflict(
		downloadItem: { id: number; url?: string },
		suggest: (suggestion: { filename: string; conflictAction: 'uniquify' }) => void,
	): boolean {
		const url = typeof downloadItem.url === 'string' ? downloadItem.url : null;
		const trackedById = snipSnipDownloads.has(downloadItem.id);
		const trackedByUrl = url !== null && snipSnipUrls.has(url);
		const isOurBlobUrl = url !== null && snipSnipBlobUrls.has(url);

		if (!trackedById && !trackedByUrl && !isOurBlobUrl) {
			return false;
		}

		let filename: string | null | undefined;
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

const downloadTracker = { createDownloadTracker };

export default downloadTracker;
