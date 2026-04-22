import { sendMessage } from './messaging';

const NO_RECEIVER = /Could not establish connection|Receiving end does not exist/i;
const RESTRICTED_TAB =
	/Cannot access (?:contents of )?(?:the )?(?:page|url)|cannot be scripted|chrome-extension:|chrome:|edge:|about:|moz-extension:|view-source:|chrome-search:|chrome-untrusted:/i;

export class RestrictedTabError extends Error {
	constructor() {
		super("SnipSnip can't run on this page (browser-internal pages are blocked).");
		this.name = 'RestrictedTabError';
	}
}

export async function ensureContentScript(tabId: number): Promise<void> {
	try {
		await sendMessage('ping', undefined, tabId);
		return;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (!NO_RECEIVER.test(msg)) throw e;
	}

	try {
		await browser.scripting.executeScript({
			target: { tabId },
			files: ['/content-scripts/content.js'],
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (RESTRICTED_TAB.test(msg)) throw new RestrictedTabError();
		throw e;
	}
}
