// Typed extension messaging via @webext-core/messaging.
//
// Migration strategy: this module replaces the untyped
// `browser.runtime.sendMessage({type, ...})` / `onMessage.addListener(handler)`
// pattern for the critical clip pipeline. Messages NOT listed in the
// `ExtensionMessages` protocol below keep flowing through raw
// `browser.runtime.*` calls — the two systems coexist without crosstalk
// (@webext-core wraps messages in a specific envelope that raw listeners
// don't see, and vice versa).
//
// To migrate a new message: (1) add its signature here, (2) change every
// sender from `browser.runtime.sendMessage({type:'X', ...})` to
// `sendMessage('X', data)`, (3) change every receiver from the big
// `onMessage.addListener` switch to a dedicated `onMessage('X', handler)`.
//
// See https://webext-core.aklinker1.io/messaging/ for API reference.

import { defineExtensionMessaging } from '@webext-core/messaging';

/** Payload the popup sends to kick off a clip. */
export interface ClipRequest {
	dom: string;
	selection: string;
	pageUrl: string | null;
	clipSelection?: boolean;
	[extraOption: string]: unknown;
}

/** What the offscreen document sends back on success. */
export interface MarkdownResult {
	requestId: string;
	result: {
		markdown: string;
		article: Record<string, unknown>;
		imageList: Record<string, string> | null;
		sourceImageMap: Record<string, string> | null;
		mdClipsFolder: string | null;
		effectiveOptions?: Record<string, unknown> | null;
		matchedSiteRule?: unknown;
		overriddenKeys?: string[];
	};
}

/** What the offscreen document sends back on failure. */
export interface ProcessError {
	error: string;
	stack?: string | null;
}

/** What the SW forwards to the popup once markdown is ready. */
export interface DisplayMarkdown {
	markdown: string;
	article: Record<string, unknown>;
	imageList: Record<string, string> | null;
	sourceImageMap: Record<string, string> | null;
	mdClipsFolder: string | null;
	options: Record<string, unknown>;
	effectiveOptions: Record<string, unknown> | null;
	matchedSiteRule: unknown;
	overriddenKeys: string[];
}

/** What the SW forwards to the popup when the offscreen path threw. */
export interface ClipError {
	error: string;
}

/**
 * Protocol map consumed by @webext-core/messaging. The key is the wire-level
 * message name; the value is a function whose *parameter* is the payload and
 * whose *return* is the response. Void return = fire-and-forget.
 */
export interface ExtensionMessages {
	clip(data: ClipRequest): void;
	// SW → offscreen uses raw browser.runtime.sendMessage (fire-and-forget)
	// because chrome.offscreen.createDocument + @webext-core listener
	// registration race each other; the response isn't needed anyway since
	// offscreen sends markdown-result / process-error as separate messages.
	'markdown-result'(data: MarkdownResult): void;
	'process-error'(data: ProcessError): void;
	'display.md'(data: DisplayMarkdown): void;
	'clip-error'(data: ClipError): void;
}

const messaging = defineExtensionMessaging<ExtensionMessages>();

export const sendMessage = messaging.sendMessage;
export const onMessage = messaging.onMessage;
export const removeAllListeners = messaging.removeAllListeners;
