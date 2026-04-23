<script lang="ts">
	import { downloadMarkdown } from '@/lib/clipboard';
	import { type ClipEntry, searchLibrary } from '@/lib/library';
	import {
		clearHistory,
		deleteClip,
		libraryItem,
		pinClip,
		unpinClip,
	} from '@/lib/library-store';
	import { onMount } from 'svelte';

	let entries = $state<ClipEntry[]>([]);
	let query = $state('');
	let loading = $state(true);
	let selected = $state<string | null>(null);

	const filtered = $derived(searchLibrary(entries, query));
	const pinned = $derived(filtered.filter((e) => e.pinned));
	const history = $derived(filtered.filter((e) => !e.pinned));
	const focused = $derived(filtered.find((e) => e.id === selected) ?? null);

	onMount(() => {
		const unwatch = libraryItem.watch((next) => {
			entries = next;
		});
		void libraryItem.getValue().then((value) => {
			entries = value;
			loading = false;
		});
		return unwatch;
	});

	function formatDate(ts: number): string {
		return new Date(ts).toLocaleString();
	}

	async function copyEntry(entry: ClipEntry): Promise<void> {
		await navigator.clipboard.writeText(entry.markdown);
	}

	async function downloadEntry(entry: ClipEntry): Promise<void> {
		await downloadMarkdown(entry.markdown, entry.filename, false);
	}

	async function removeEntry(entry: ClipEntry): Promise<void> {
		if (selected === entry.id) {
			const idx = filtered.findIndex((e) => e.id === entry.id);
			const next = filtered[idx + 1] ?? filtered[idx - 1];
			selected = next?.id ?? null;
		}
		await deleteClip(entry.id);
	}

	async function togglePin(entry: ClipEntry): Promise<void> {
		if (entry.pinned) {
			await unpinClip(entry.id);
		} else {
			await pinClip(entry.id);
		}
	}

	async function clearAllHistory(): Promise<void> {
		await clearHistory();
		if (focused && !focused.pinned) selected = null;
	}
</script>

<header>
	<h1>Library</h1>
	<input
		type="search"
		placeholder="Search title, URL, body…"
		bind:value={query}
		disabled={loading}
	>
	<button
		type="button"
		onclick={clearAllHistory}
		disabled={loading || history.length === 0}
	>
		Clear history
	</button>
</header>

{#if loading}
	<p class="muted">Loading…</p>
{:else if entries.length === 0}
	<p class="muted">
		No clips saved yet. Use the popup or hotkeys to clip a page.
	</p>
{:else if filtered.length === 0}
	<p class="muted">No clips match "{query}".</p>
{:else}
	<div class="layout">
		<div class="list-pane">
			{#if pinned.length > 0}
				<h2 class="section-label">Library</h2>
				<ul class="list">
					{#each pinned as entry (entry.id)}
						<li>
							<button
								type="button"
								class="row"
								class:active={selected === entry.id}
								onclick={() => (selected = entry.id)}
							>
								<span class="title">
									<span class="pin-badge" title="Saved to library">★</span>
									{entry.title}
								</span>
								<span class="meta">
									<span>{entry.siteName ?? new URL(entry.url).hostname}</span>
									<span>·</span>
									<span>{formatDate(entry.savedAt)}</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if history.length > 0}
				<h2 class="section-label">History</h2>
				<ul class="list">
					{#each history as entry (entry.id)}
						<li>
							<button
								type="button"
								class="row"
								class:active={selected === entry.id}
								onclick={() => (selected = entry.id)}
							>
								<span class="title">{entry.title}</span>
								<span class="meta">
									<span>{entry.siteName ?? new URL(entry.url).hostname}</span>
									<span>·</span>
									<span>{formatDate(entry.savedAt)}</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		<aside class="preview">
			{#if focused}
				<div class="preview-head">
					<div>
						<div class="preview-title">{focused.title}</div>
						<a href={focused.url} target="_blank" rel="noreferrer noopener">{
							focused.url
						}</a>
					</div>
					<div class="preview-actions">
						<button
							type="button"
							class="pin-btn"
							class:pinned={focused.pinned}
							onclick={() => togglePin(focused)}
							title={focused.pinned ? 'Remove from library' : 'Save to library'}
						>
							{focused.pinned ? '★' : '☆'}
						</button>
						<button type="button" onclick={() => copyEntry(focused)}>
							Copy
						</button>
						<button type="button" onclick={() => downloadEntry(focused)}>
							Download
						</button>
						<button
							type="button"
							class="danger"
							onclick={() => removeEntry(focused)}
						>
							Delete
						</button>
					</div>
				</div>
				<pre>{focused.markdown}</pre>
			{:else}
				<p class="muted">Select a clip to preview.</p>
			{/if}
		</aside>
	</div>
{/if}

<style>
	header {
		display: flex;
		gap: 12px;
		align-items: center;
		margin-bottom: 20px;
	}
	header h1 {
		margin: 0;
		font-size: 22px;
		flex-shrink: 0;
	}
	header input[type="search"] {
		flex: 1;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--fg);
		font: inherit;
	}
	header button {
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--fg);
		cursor: pointer;
	}
	header button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.muted {
		color: var(--muted);
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		margin: 12px 0 6px;
		padding: 0;
	}
	.section-label:first-child {
		margin-top: 0;
	}

	.layout {
		display: grid;
		grid-template-columns: 320px minmax(0, 1fr);
		gap: 16px;
	}
	.list-pane {
		max-height: 70vh;
		overflow: auto;
	}
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.row {
		width: 100%;
		text-align: left;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 10px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--fg);
		cursor: pointer;
		font: inherit;
	}
	.row.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
	}
	.row .title {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.pin-badge {
		color: var(--accent);
		font-size: 12px;
		flex-shrink: 0;
	}
	.row .meta {
		display: flex;
		gap: 6px;
		color: var(--muted);
		font-size: 12px;
	}
	.preview {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
		min-height: 320px;
	}
	.preview-head {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: flex-start;
	}
	.preview-title {
		font-weight: 600;
		font-size: 16px;
	}
	.preview-head a {
		color: var(--muted);
		text-decoration: none;
		font-size: 12px;
	}
	.preview-head a:hover {
		text-decoration: underline;
	}
	.preview-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
		align-items: center;
	}
	.preview-actions button {
		padding: 6px 10px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
		color: var(--fg);
		cursor: pointer;
		font-size: 12px;
	}
	.pin-btn {
		font-size: 16px;
		padding: 4px 8px;
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		transition: color 0.15s;
	}
	.pin-btn:hover, .pin-btn.pinned {
		color: var(--accent);
	}
	.preview-actions .danger {
		color: var(--danger);
		border-color: var(--danger);
	}
	pre {
		flex: 1;
		margin: 0;
		padding: 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 6px;
		overflow: auto;
		font-family:
			"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
		white-space: pre-wrap;
		max-height: 60vh;
	}
</style>
