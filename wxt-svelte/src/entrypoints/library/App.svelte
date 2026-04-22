<script lang="ts">
	import { downloadMarkdown } from '@/lib/clipboard';
	import { type ClipEntry, searchLibrary } from '@/lib/library';
	import { clearLibrary, deleteClip, libraryItem } from '@/lib/library-store';
	import { onMount } from 'svelte';

	let entries = $state<ClipEntry[]>([]);
	let query = $state('');
	let loading = $state(true);
	let selected = $state<string | null>(null);

	const filtered = $derived(searchLibrary(entries, query));
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
		await deleteClip(entry.id);
		if (selected === entry.id) selected = null;
	}

	async function clearAll(): Promise<void> {
		await clearLibrary();
		selected = null;
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
		onclick={clearAll}
		disabled={loading || entries.length === 0}
	>
		Clear all
	</button>
</header>

{#if loading}
	<p class="muted">Loading…</p>
{:else if entries.length === 0}
	<p class="muted">
		No clips saved yet. Use the popup or hotkeys to clip a page.
	</p>
{:else if filtered.length === 0}
	<p class="muted">No clips match “{query}”.</p>
{:else}
	<div class="layout">
		<ul class="list">
			{#each filtered as entry (entry.id)}
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
	.layout {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 16px;
	}
	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		max-height: 70vh;
		overflow: auto;
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
