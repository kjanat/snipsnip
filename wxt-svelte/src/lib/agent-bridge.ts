import { ensureContentScript } from './inject-content';
import { sendMessage } from './messaging';
import { settingsItem } from './storage';

interface BridgeRequest {
	type: 'clip-active-tab' | 'ping';
	mode?: 'document' | 'selection';
}

interface BridgePong {
	type: 'pong';
	version: string;
}

interface BridgeClip {
	type: 'clip';
	url: string;
	title: string;
	markdown: string;
}

interface BridgeError {
	type: 'error';
	message: string;
}

type BridgeResponse = BridgePong | BridgeClip | BridgeError;

let port: ReturnType<typeof browser.runtime.connectNative> | undefined;

export class NativeMessagingUnavailableError extends Error {
	constructor() {
		super('Native messaging is not available — grant the optional permission first.');
		this.name = 'NativeMessagingUnavailableError';
	}
}

export async function isAgentBridgeGranted(): Promise<boolean> {
	if (typeof browser.runtime.connectNative !== 'function') return false;
	if (!browser.permissions?.contains) return false;
	try {
		return await browser.permissions.contains({ permissions: ['nativeMessaging'] });
	} catch {
		return false;
	}
}

export async function requestAgentBridgePermission(): Promise<boolean> {
	if (!browser.permissions?.request) return false;
	return browser.permissions.request({ permissions: ['nativeMessaging'] });
}

async function activeTabId(): Promise<number> {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) throw new Error('No active tab');
	return tab.id;
}

async function handleRequest(message: BridgeRequest): Promise<BridgeResponse> {
	if (message.type === 'ping') {
		return { type: 'pong', version: browser.runtime.getManifest().version };
	}
	if (message.type === 'clip-active-tab') {
		const tabId = await activeTabId();
		await ensureContentScript(tabId);
		const tab = await browser.tabs.get(tabId);
		const result = await sendMessage(
			'performClip',
			{ mode: message.mode ?? 'document' },
			tabId,
		);
		return {
			type: 'clip',
			url: tab.url ?? '',
			title: tab.title ?? '',
			markdown: result.markdown,
		};
	}
	return { type: 'error', message: `Unknown request type` };
}

export async function startAgentBridge(): Promise<void> {
	if (port) return;
	const settings = await settingsItem.getValue();
	if (!settings.agentBridgeEnabled) return;
	if (!(await isAgentBridgeGranted())) return;

	port = browser.runtime.connectNative(settings.agentBridgeHost);
	port.onMessage.addListener(async (raw: unknown) => {
		try {
			const response = await handleRequest(raw as BridgeRequest);
			port?.postMessage(response);
		} catch (e) {
			port?.postMessage({
				type: 'error',
				message: e instanceof Error ? e.message : String(e),
			});
		}
	});
	port.onDisconnect.addListener(() => {
		port = undefined;
	});
}

export function stopAgentBridge(): void {
	port?.disconnect();
	port = undefined;
}

export async function syncAgentBridge(): Promise<void> {
	const settings = await settingsItem.getValue();
	if (settings.agentBridgeEnabled) {
		await startAgentBridge();
	} else {
		stopAgentBridge();
	}
}
