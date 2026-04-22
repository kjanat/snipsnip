import { defineExtensionMessaging } from '@webext-core/messaging';
import type { ClipMode, ClipResult } from './types';

export interface SnapshotPayload {
	mode: ClipMode;
	html: string;
	url: string;
	title: string;
	selection: string | null;
}

export interface ClipRequest {
	mode: ClipMode;
}

export interface DownloadRequest {
	filename: string;
	markdown: string;
	saveAs: boolean;
}

export interface ObsidianRequest {
	vault: string;
	folder: string;
	filename: string;
	markdown: string;
}

export interface ProtocolMap {
	captureSnapshot(payload: ClipRequest): SnapshotPayload;
	performClip(payload: ClipRequest): ClipResult;
	downloadMarkdown(payload: DownloadRequest): { downloadId: number };
	copyMarkdown(markdown: string): { ok: true };
	sendToObsidian(payload: ObsidianRequest): { ok: true };
	ping(): { ok: true };
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
