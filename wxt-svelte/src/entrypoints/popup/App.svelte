<script lang="ts">
	import { type ExportFormat, exportPayload } from '@/lib/export';
	import { sanitizeFilename } from '@/lib/filename';
	import { formatMarkdown } from '@/lib/format';
	import {
		extractImageRefs,
		fetchImageBundle,
		rewriteImageRefs,
	} from '@/lib/images';
	import { ensureContentScript } from '@/lib/inject-content';
	import { recordClip } from '@/lib/library-store';
	import MarkdownEditor from '@/lib/MarkdownEditor.svelte';
	import { sendMessage } from '@/lib/messaging';
	import { getSettings } from '@/lib/storage';
	import { applyTemplate } from '@/lib/template';
	import type { ClipMode, ClipResult } from '@/lib/types';
	import { buildZipBlob } from '@/lib/zip';
	import { onMount } from 'svelte';

	async function trackedDownload(
		blobUrl: string,
		filename: string,
		saveAs: boolean,
	): Promise<void> {
		await sendMessage('trackDownloadUrl', { url: blobUrl, filename });
		await browser.downloads.download({ url: blobUrl, filename, saveAs });
	}

	let mode: ClipMode = $state('document');
	let busy = $state(false);
	let error = $state<string | null>(null);
	let result = $state<ClipResult | null>(null);
	let editable = $state('');
	let format: ExportFormat = $state('md');
	let copied = $state(false);
	let downloaded = $state(false);
	let wrap = $state(true);
	let formatted = $state(false);
	let preFormatSnapshot = $state('');

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
			formatted = false;
			preFormatSnapshot = '';
			const settings = await getSettings();
			const filename = sanitizeFilename(
				applyTemplate(settings.title, next.article),
			);
			void recordClip(next, filename);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			result = null;
			editable = '';
		} finally {
			busy = false;
		}
	}

	async function toggleFormat(): Promise<void> {
		try {
			if (formatted) {
				editable = preFormatSnapshot;
				formatted = false;
			} else {
				preFormatSnapshot = editable;
				editable = await formatMarkdown(editable);
				formatted = true;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
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
				await trackedDownload(url, `${stem}.zip`, settings.saveAs);
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
			await trackedDownload(url, `${stem}.${payload.ext}`, settings.saveAs);
			downloaded = true;
			setTimeout(() => (downloaded = false), 1500);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
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
		<div class="editor-wrap">
			<button
				class="fmt-toggle"
				class:active={formatted}
				type="button"
				onclick={toggleFormat}
				title={formatted ? 'Show raw markdown' : 'Format with dprint'}
				aria-label="Toggle formatting"
			>
				¶
			</button>
			<button
				class="wrap-toggle"
				type="button"
				onclick={() => (wrap = !wrap)}
				title={wrap ? 'Disable word wrap' : 'Enable word wrap'}
				aria-label="Toggle word wrap"
			>
				{wrap ? '↩' : '→'}
			</button>
			<MarkdownEditor bind:value={editable} {wrap} />
		</div>
	{:else if !error}
		<div class="status">Nothing yet.</div>
	{/if}
</main>

<footer>
	<button
		type="button"
		onclick={copyAll}
		disabled={!result}
		title="Copy to clipboard"
		aria-label="Copy to clipboard"
	>
		<svg
			class="btn-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			{#if copied}
				<polyline points="20 6 9 17 4 12" />
			{:else}
				<rect width="14" height="14" x="8" y="8" rx="2" />
				<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
			{/if}
		</svg>
	</button>
	<div class="export-group">
		<button
			type="button"
			onclick={downloadCurrent}
			disabled={!result}
			title="Download"
			aria-label="Download"
		>
			<svg
				class="btn-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{#if downloaded}
					<polyline points="20 6 9 17 4 12" />
				{:else}
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" x2="12" y1="15" y2="3" />
				{/if}
			</svg>
		</button>
		<select
			bind:value={format}
			name="format"
			disabled={!result}
			aria-label="Export format"
		>
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
		title="Send to Obsidian"
		aria-label="Send to Obsidian"
	>
		<svg
			class="btn-icon obsidian-icon"
			viewBox="0 0 19.41 25"
			aria-hidden="true"
		>
			<path
				fill="currentColor"
				d="M6.92 14.596c.64-.191 1.672-.484 2.859-.557-.712-1.797-.884-3.37-.746-4.77.16-1.616.73-2.965 1.286-4.113q.177-.366.341-.692c.155-.31.3-.602.437-.896.227-.49.395-.922.48-1.324.083-.395.084-.748-.015-1.086-.1-.34-.31-.704-.71-1.104a1.67 1.67 0 0 0-1.536.374L4.161 5.066c-.288.259-.477.61-.534.992l-.445 2.947c.699.618 2.424 2.414 3.474 4.907q.14.333.263.683m-3.946-4.244a1.7 1.7 0 0 1-.102.303L.146 16.727a1.67 1.67 0 0 0 .326 1.846l4.288 4.416c2.19-3.23 1.87-6.27.87-8.646-.758-1.8-1.908-3.21-2.657-3.992"
			/>
			<path
				fill="currentColor"
				d="M5.75 23.51q.114.017.229.02c.814.025 2.182.096 3.292.3.906.168 2.7.67 4.178 1.101 1.127.33 2.289-.57 2.452-1.734.12-.848.343-1.807.755-2.686l-.01.003c-.697-1.947-1.586-3.204-2.517-4.007a5.5 5.5 0 0 0-2.893-1.31c-1.605-.226-3.075.196-4.001.468.555 2.311.384 5.03-1.484 7.844"
			/>
			<path
				fill="currentColor"
				d="M17.37 19.31a72 72 0 0 0 1.936-3.076.845.845 0 0 0-.064-.938c-.538-.713-1.566-2.16-2.127-3.501-.576-1.379-.662-3.52-.667-4.562a1.78 1.78 0 0 0-.373-1.094l-3.331-4.232q-.02.286-.079.567c-.11.524-.32 1.046-.558 1.561-.14.303-.302.626-.465.953q-.165.328-.322.652c-.539 1.113-1.04 2.32-1.18 3.74-.13 1.314.048 2.844.849 4.67a7 7 0 0 1 .402.045 6.63 6.63 0 0 1 3.465 1.569c.954.822 1.816 2.001 2.515 3.646"
			/>
		</svg>
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
		min-height: 0;
	}
	.editor-wrap {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.wrap-toggle {
		position: absolute;
		top: 6px;
		right: 6px;
		z-index: 5;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--muted);
		border-radius: 4px;
		font-size: 13px;
		padding: 2px 6px;
		cursor: pointer;
		opacity: 0.45;
		transition: opacity 0.15s;
	}
	.wrap-toggle:hover {
		opacity: 1;
		color: var(--fg);
	}
	.fmt-toggle {
		position: absolute;
		top: 6px;
		right: 36px;
		z-index: 5;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--muted);
		border-radius: 4px;
		font-size: 13px;
		padding: 2px 6px;
		cursor: pointer;
		opacity: 0.45;
		transition: opacity 0.15s;
	}
	.fmt-toggle:hover {
		opacity: 1;
		color: var(--fg);
	}
	.fmt-toggle.active {
		opacity: 1;
		color: var(--accent);
		border-color: var(--accent);
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
		padding: 8px 10px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--fg);
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-icon {
		width: 16px;
		height: 16px;
	}
	.obsidian-icon {
		width: 13px;
		height: 16px;
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
