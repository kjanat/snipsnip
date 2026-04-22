import { onMessage } from '@/lib/messaging';
import { runClipPipeline } from '@/lib/pipeline';

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
	main() {
		onMessage('performClip', ({ data }) => runClipPipeline(data.mode));

		onMessage('copyMarkdown', async ({ data }) => {
			await copyText(data);
			return { ok: true };
		});

		onMessage('sendToObsidian', ({ data }) => {
			window.location.href = buildObsidianUri(data);
			return { ok: true };
		});
	},
});
