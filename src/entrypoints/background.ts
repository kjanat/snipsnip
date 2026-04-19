import { defineBackground } from 'wxt/utils/define-background';

import { loadBrowserApi } from '../lib/vendors/index.ts';

// Minimal scaffold only. Real background parity lands in later PRD tasks.
export default defineBackground(() => {
	void loadBrowserApi().catch((error) => {
		console.error('[WXT] Failed to preload browser polyfill wrapper:', error);
	});
});
