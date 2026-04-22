import { syncAgentBridge } from '@/lib/agent-bridge';
import { sanitizeFilename, withMarkdownExtension } from '@/lib/filename';
import { ensureContentScript } from '@/lib/inject-content';
import { recordClip } from '@/lib/library-store';
import { sendMessage } from '@/lib/messaging';
import { notifyClipFailed, notifyClipSaved } from '@/lib/notifications';
import { settingsItem } from '@/lib/storage';
import { applyTemplate } from '@/lib/template';

const CONTEXT_MENUS = [
	{ id: 'clip-page', title: 'Save page as Markdown', contexts: ['page'] as const },
	{ id: 'clip-selection', title: 'Save selection as Markdown', contexts: ['selection'] as const },
	{ id: 'copy-selection', title: 'Copy selection as Markdown', contexts: ['selection'] as const },
	{ id: 'copy-link', title: 'Copy as Markdown link', contexts: ['link'] as const },
] as const;

async function activeTabId(): Promise<number> {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	if (!tab?.id) throw new Error('No active tab');
	return tab.id;
}

async function clipActiveTab(mode: 'document' | 'selection') {
	const tabId = await activeTabId();
	try {
		await ensureContentScript(tabId);
		const result = await sendMessage('performClip', { mode }, tabId);
		const settings = await settingsItem.getValue();
		const filename = withMarkdownExtension(
			sanitizeFilename(applyTemplate(settings.title, result.article)),
		);
		const blob = new Blob([result.markdown], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const downloadId = await browser.downloads.download({
			url,
			filename,
			saveAs: settings.saveAs,
		});
		await recordClip(result, filename);
		await notifyClipSaved(filename);
		return { downloadId };
	} catch (e) {
		const reason = e instanceof Error ? e.message : String(e);
		await notifyClipFailed(reason);
		throw e;
	}
}

async function copyActiveTab(mode: 'document' | 'selection') {
	const tabId = await activeTabId();
	await ensureContentScript(tabId);
	const { markdown } = await sendMessage('performClip', { mode }, tabId);
	await sendMessage('copyMarkdown', markdown, tabId);
}

async function copyTabAsLink(): Promise<void> {
	const tabId = await activeTabId();
	await ensureContentScript(tabId);
	const tab = await browser.tabs.get(tabId);
	const link = `[${tab.title ?? tab.url ?? ''}](${tab.url ?? ''})`;
	await sendMessage('copyMarkdown', link, tabId);
}

async function sendActiveTabToObsidian(): Promise<void> {
	const tabId = await activeTabId();
	await ensureContentScript(tabId);
	const result = await sendMessage('performClip', { mode: 'document' }, tabId);
	const settings = await settingsItem.getValue();
	const filename = sanitizeFilename(applyTemplate(settings.title, result.article));
	await sendMessage(
		'sendToObsidian',
		{
			vault: settings.obsidianVault,
			folder: settings.obsidianFolder,
			filename,
			markdown: result.markdown,
		},
		tabId,
	);
}

export default defineBackground(() => {
	browser.runtime.onInstalled.addListener(({ reason }) => {
		for (const item of CONTEXT_MENUS) {
			browser.contextMenus.create({
				id: item.id,
				title: item.title,
				contexts: [...item.contexts],
			});
		}
		void syncAgentBridge();
		if (reason === 'install') {
			void browser.tabs.create({ url: browser.runtime.getURL('/guide.html') });
		}
	});

	browser.runtime.onStartup.addListener(() => {
		void syncAgentBridge();
	});

	browser.storage.onChanged.addListener((changes, area) => {
		if (area === 'sync' && 'settings' in changes) {
			void syncAgentBridge();
		}
	});

	browser.contextMenus.onClicked.addListener(async (info) => {
		switch (info.menuItemId) {
			case 'clip-page':
				await clipActiveTab('document');
				return;
			case 'clip-selection':
				await clipActiveTab('selection');
				return;
			case 'copy-selection':
				await copyActiveTab('selection');
				return;
			case 'copy-link': {
				const tabId = await activeTabId();
				const link = `[${info.selectionText ?? info.linkUrl ?? ''}](${info.linkUrl ?? ''})`;
				await sendMessage('copyMarkdown', link, tabId);
				return;
			}
		}
	});

	browser.commands.onCommand.addListener(async (command) => {
		switch (command) {
			case 'download_tab_as_markdown':
				await clipActiveTab('document');
				return;
			case 'copy_tab_as_markdown':
				await copyActiveTab('document');
				return;
			case 'copy_selection_as_markdown':
				await copyActiveTab('selection');
				return;
			case 'copy_tab_as_markdown_link':
				await copyTabAsLink();
				return;
			case 'copy_tab_to_obsidian':
				await sendActiveTabToObsidian();
				return;
		}
	});
});
