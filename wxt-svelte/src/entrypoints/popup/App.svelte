<script lang="ts">
	import { downloadMarkdown } from '@/lib/clipboard';
	import { sanitizeFilename, withMarkdownExtension } from '@/lib/filename';
	import { sendMessage } from '@/lib/messaging';
	import { settingsItem } from '@/lib/storage';
	import { applyTemplate } from '@/lib/template';
	import type { ClipMode, ClipResult } from '@/lib/types';
	import { onMount } from 'svelte';

	let mode: ClipMode = $state('document');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ClipResult | null>(null);
	let editable = $state('');

	onMount(() => {
		void run();
	});

	async function activeTabId(): Promise<number> {
		const [tab] = await browser.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (!tab?.id) throw new Error('No active tab');
		return tab.id;
	}

	async function run(): Promise<void> {
		busy = true;
		error = null;
		try {
			const tabId = await activeTabId();
			const next = await sendMessage('performClip', { mode }, tabId);
			result = next;
			editable = next.markdown;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			result = null;
			editable = '';
		} finally {
			busy = false;
		}
	}

	async function copyAll(): Promise<void> {
		await navigator.clipboard.writeText(editable);
	}

	async function downloadCurrent(): Promise<void> {
		if (!result) return;
		const settings = await settingsItem.getValue();
		const filename = withMarkdownExtension(
			sanitizeFilename(applyTemplate(settings.title, result.article)),
		);
		await downloadMarkdown(editable, filename, settings.saveAs);
	}

	async function sendToObsidian(): Promise<void> {
		if (!result) return;
		const settings = await settingsItem.getValue();
		if (!settings.obsidianVault) {
			error = 'Set an Obsidian vault in Settings first.';
			return;
		}
		const tabId = await activeTabId();
		await sendMessage(
			'sendToObsidian',
			{
				vault: settings.obsidianVault,
				folder: settings.obsidianFolder,
				filename: sanitizeFilename(
					applyTemplate(settings.title, result.article),
				),
				markdown: editable,
			},
			tabId,
		);
	}

	function openOptions(): void {
		browser.runtime.openOptionsPage();
	}

	function setMode(next: ClipMode): void {
		if (mode === next) return;
		mode = next;
		void run();
	}
</script>

<header>
	<div class="brand">SnipSnip</div>
	<button
		class="ghost"
		type="button"
		onclick={openOptions}
		aria-label="Settings"
	>
		⚙
	</button>
</header>

<div class="tabs" role="tablist">
	<button
		role="tab"
		aria-selected={mode === 'document'}
		class:active={mode === 'document'}
		onclick={() => setMode('document')}
		type="button"
	>
		Document
	</button>
	<button
		role="tab"
		aria-selected={mode === 'selection'}
		class:active={mode === 'selection'}
		onclick={() => setMode('selection')}
		type="button"
	>
		Selection
	</button>
</div>

{#if error}
	<div class="error" role="alert">{error}</div>
{/if}

<main>
	{#if busy}
		<div class="status">Clipping…</div>
	{:else if result}
		<div class="meta">
			<div class="title">{result.article.title}</div>
			{#if result.article.byline}<div class="byline">
					{result.article.byline}
				</div>{/if}
		</div>
		<textarea bind:value={editable} spellcheck="false"></textarea>
	{:else if !error}
		<div class="status">Nothing yet.</div>
	{/if}
</main>

<footer>
	<button type="button" onclick={copyAll} disabled={!result}>Copy</button>
	<button type="button" onclick={downloadCurrent} disabled={!result}>
		Download
	</button>
	<button
		class="primary"
		type="button"
		onclick={sendToObsidian}
		disabled={!result}
	>
		Obsidian
	</button>
</footer>

<style>
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 14px;
		border-bottom: 1px solid var(--border);
	}
	.brand {
		font-weight: 700;
		letter-spacing: 0.02em;
	}
	.ghost {
		background: transparent;
		border: 1px solid transparent;
		color: var(--fg);
		cursor: pointer;
		font-size: 16px;
		padding: 4px 8px;
		border-radius: 6px;
	}
	.ghost:hover {
		border-color: var(--border);
	}

	.tabs {
		display: flex;
		gap: 4px;
		padding: 8px 14px 0;
	}
	.tabs button {
		flex: 1;
		background: var(--surface);
		color: var(--fg);
		border: 1px solid var(--border);
		border-bottom: none;
		border-radius: 6px 6px 0 0;
		padding: 6px 8px;
		cursor: pointer;
		font-size: 12px;
	}
	.tabs button.active {
		background: var(--bg);
		border-color: var(--accent);
		color: var(--accent);
		font-weight: 600;
	}

	main {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 14px;
		flex: 1;
	}
	.meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.title {
		font-weight: 600;
	}
	.byline {
		color: var(--muted);
		font-size: 12px;
	}
	.status {
		color: var(--muted);
		text-align: center;
		padding: 24px 0;
	}
	textarea {
		width: 100%;
		min-height: 240px;
		resize: vertical;
		font-family:
			"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
		padding: 8px;
		background: var(--surface);
		color: var(--fg);
		border: 1px solid var(--border);
		border-radius: 6px;
	}

	.error {
		margin: 8px 14px 0;
		padding: 8px 10px;
		border: 1px solid var(--danger);
		color: var(--danger);
		border-radius: 6px;
		background: color-mix(in srgb, var(--danger) 10%, transparent);
	}

	footer {
		display: flex;
		gap: 6px;
		padding: 10px 14px;
		border-top: 1px solid var(--border);
	}
	footer button {
		flex: 1;
		padding: 8px 10px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--fg);
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}
	footer button:hover:not(:disabled) {
		border-color: var(--accent);
	}
	footer button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	footer .primary {
		background: var(--accent);
		color: var(--accent-fg);
		border-color: var(--accent);
	}
</style>
