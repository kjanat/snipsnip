import { defineContentScript } from 'wxt/utils/define-content-script';

import { bootContentScriptRuntime } from '../lib/content/bootstrap.ts';

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',
	async main() {
		await bootContentScriptRuntime();
	},
});
