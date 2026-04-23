import { onMessage } from '@/lib/messaging.ts';
import { runClipPipeline } from '@/lib/pipeline.ts';

function buildObsidianUri(payload: {
	vault: string;
	folder: string;
	filename: string;
	markdown: string;
}): string {
	const params = new URLSearchParams({
		vault: payload.vault,
		filepath: payload.folder ? `${payload.folder}/${payload.filename}.md` : `${payload.filename}.md`,
		content: payload.markdown,
	});
	return `obsidian://new?${params.toString()}`;
}

async function copyText(text: string): Promise<void> {
	await navigator.clipboard.writeText(text);
}

export default defineContentScript({
	matches: ['<all_urls>'],
	runAt: 'document_idle',
	main(ctx) {
		const removePing = onMessage('ping', () => ({ ok: true }) as const);

		const removeSelectionState = onMessage('getSelectionState', () => {
			const selection = window.getSelection();
			const text = selection ? selection.toString().trim() : '';
			return { hasSelection: text.length > 0 };
		});

		const removePerformClip = onMessage('performClip', ({ data }) => {
			if (ctx.isInvalid) return Promise.reject(new Error('Context invalidated'));
			return runClipPipeline(data.mode);
		});

		const removeCopy = onMessage('copyMarkdown', async ({ data }) => {
			if (ctx.isInvalid) throw new Error('Context invalidated');
			await copyText(data);
			return { ok: true };
		});

		const removeObsidian = onMessage('sendToObsidian', ({ data }) => {
			if (ctx.isInvalid) throw new Error('Context invalidated');
			window.location.href = buildObsidianUri(data);
			return { ok: true };
		});

		ctx.onInvalidated(() => {
			removePing();
			removeSelectionState();
			removePerformClip();
			removeCopy();
			removeObsidian();
		});
	},
});
