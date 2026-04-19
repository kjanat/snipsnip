export const BACKGROUND_MESSAGE_TYPES = [
	'get-pending-notification',
	'mark-notification-shown',
	'dismiss-notification',
	'record-notification-metrics',
	'clip',
	'download',
	'download-generated-file',
	'download-images',
	'download-images-content-script',
	'track-download-url',
	'offscreen-ready',
	'markdown-result',
	'download-complete',
	'get-tab-content',
	'forward-get-article-content',
	'execute-content-download',
	'cleanup-blob-url',
	'service-worker-download',
	'offscreen-download-failed',
	'open-obsidian-uri',
	'obsidian-integration',
	'start-batch-conversion',
	'export-library-items',
	'export-library-items-individual',
	'get-agent-bridge-status',
	'refresh-agent-bridge-status',
	'cancel-batch',
	'get-batch-state',
] as const;

const BACKGROUND_MESSAGE_TYPE_SET = new Set<string>(BACKGROUND_MESSAGE_TYPES);

export type BackgroundMessageType = (typeof BACKGROUND_MESSAGE_TYPES)[number];

export interface BackgroundMessage {
	type: BackgroundMessageType;
	[key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function isBackgroundMessageType(value: unknown): value is BackgroundMessageType {
	return typeof value === 'string' && BACKGROUND_MESSAGE_TYPE_SET.has(value);
}

export function isBackgroundMessage(value: unknown): value is BackgroundMessage {
	return isRecord(value) && isBackgroundMessageType(value.type);
}
