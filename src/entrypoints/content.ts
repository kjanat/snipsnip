import { bootContentScriptRuntime } from '@/lib/content/bootstrap.ts';

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',
	async main() {
		await bootContentScriptRuntime();
	},
});
