<script lang="ts">
	import { type ExportFormat, exportPayload } from '@/lib/export';
	import { sanitizeFilename } from '@/lib/filename';
	import {
		extractImageRefs,
		fetchImageBundle,
		rewriteImageRefs,
	} from '@/lib/images';
	import { ensureContentScript } from '@/lib/inject-content';
	import MarkdownEditor from '@/lib/MarkdownEditor.svelte';
	import { sendMessage } from '@/lib/messaging';
	import { getSettings } from '@/lib/storage';
	import { applyTemplate } from '@/lib/template';
	import type { ClipMode, ClipResult } from '@/lib/types';
	import { buildZipBlob } from '@/lib/zip';
	import { onMount } from 'svelte';

	let mode: ClipMode = $state('document');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ClipResult | null>(null);
	let editable = $state('');
	let format: ExportFormat = $state('md');
	let copied = $state(false);
	let downloaded = $state(false);

	onMount(() => {
		void initializeMode();
	});

	async function initializeMode(): Promise<void> {
		try {
			const tabId = await activeTabId();
			await ensureContentScript(tabId);
			const state = await sendMessage('getSelectionState', undefined, tabId);
			mode = state.hasSelection ? 'selection' : 'document';
		} catch {
			// fall back to document mode if anything goes wrong;
			// run() will surface the same error if it persists.
			mode = 'document';
		}
		await run();
	}

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
			await ensureContentScript(tabId);
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
		try {
			await navigator.clipboard.writeText(editable);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function downloadCurrent(): Promise<void> {
		if (!result) return;
		busy = true;
		error = null;
		try {
			const settings = await getSettings();
			const stem = sanitizeFilename(
				applyTemplate(settings.title, result.article),
			);

			if (settings.downloadImages && format === 'md') {
				const refs = extractImageRefs(editable, result.article.url);
				const images = await fetchImageBundle(refs);
				const rewritten = rewriteImageRefs(editable, images);
				const blob = buildZipBlob([
					{ path: `${stem}.md`, content: rewritten },
					...images.map((image) => ({
						path: image.localPath,
						content: image.bytes,
					})),
				]);
				const url = URL.createObjectURL(blob);
				await browser.downloads.download({
					url,
					filename: `${stem}.zip`,
					saveAs: settings.saveAs,
				});
				downloaded = true;
				setTimeout(() => (downloaded = false), 1500);
				return;
			}

			const payload = exportPayload(editable, result.article.title, format, {
				embedImages: settings.downloadImages,
				baseUrl: result.article.url,
			});
			const blob = typeof payload.content === 'string'
				? new Blob([payload.content], { type: payload.mime })
				: await payload.content;
			const url = URL.createObjectURL(blob);
			await browser.downloads.download({
				url,
				filename: `${stem}.${payload.ext}`,
				saveAs: settings.saveAs,
			});
			downloaded = true;
			setTimeout(() => (downloaded = false), 1500);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}

	async function sendToObsidian(): Promise<void> {
		if (!result) return;
		const settings = await getSettings();
		if (!settings.obsidianVault) {
			error = 'Set an Obsidian vault in Settings first.';
			return;
		}
		try {
			const tabId = await activeTabId();
			await ensureContentScript(tabId);
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
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	function openOptions(): void {
		browser.runtime.openOptionsPage();
	}

	function openBatch(): void {
		void browser.tabs.create({ url: browser.runtime.getURL('/batch.html') });
	}

	function openLibrary(): void {
		void browser.tabs.create({ url: browser.runtime.getURL('/library.html') });
	}

	function setMode(next: ClipMode): void {
		if (mode === next) return;
		mode = next;
		void run();
	}
</script>

<header>
	<div class="brand">SnipSnip</div>
	<div class="header-actions">
		<button
			class="ghost"
			type="button"
			onclick={openLibrary}
			aria-label="Library"
			title="Library"
		>
			☰
		</button>
		<button
			class="ghost"
			type="button"
			onclick={openBatch}
			aria-label="Batch clip"
			title="Batch clip"
		>
			⇶
		</button>
		<button
			class="ghost"
			type="button"
			onclick={openOptions}
			aria-label="Settings"
			title="Settings"
		>
			⚙
		</button>
	</div>
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
		<MarkdownEditor bind:value={editable} />
	{:else if !error}
		<div class="status">Nothing yet.</div>
	{/if}
</main>

<footer>
	<button type="button" onclick={copyAll} disabled={!result}>
		{copied ? 'Copied ✓' : 'Copy'}
	</button>
	<div class="export-group">
		<button type="button" onclick={downloadCurrent} disabled={!result}>
			{downloaded ? 'Saved ✓' : 'Download'}
		</button>
		<select bind:value={format} disabled={!result} aria-label="Export format">
			<option value="md">.md</option>
			<option value="html">.html</option>
			<option value="txt">.txt</option>
			<option value="pdf">.pdf</option>
		</select>
	</div>
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
	.header-actions {
		display: flex;
		gap: 4px;
	}
	.ghost {
		background: transparent;
		border: 1px solid transparent;
		color: var(--muted);
		cursor: pointer;
		font-size: 16px;
		padding: 4px 8px;
		border-radius: 6px;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}
	.ghost:hover {
		background: var(--surface);
		border-color: var(--border);
		color: var(--fg);
	}
	.ghost:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
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
	.export-group {
		flex: 1;
		display: flex;
		gap: 0;
	}
	.export-group button {
		flex: 1;
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		border-right: none;
	}
	.export-group select {
		padding: 0 6px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--fg);
		border-radius: 0 6px 6px 0;
		cursor: pointer;
		font: inherit;
	}
	.export-group select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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
