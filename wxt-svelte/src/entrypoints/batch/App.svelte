<script lang="ts">
	import {
		type BatchItem,
		buildZip,
		fetchAndConvert,
		parseUrlList,
	} from '@/lib/batch';
	import { settingsItem } from '@/lib/storage';

	let raw = $state('');
	let items = $state<BatchItem[]>([]);
	let running = $state(false);
	let zipUrl = $state<string | null>(null);

	const total = $derived(items.length);
	const done = $derived(items.filter((i) => i.status === 'done').length);
	const failed = $derived(items.filter((i) => i.status === 'error').length);

	async function run(): Promise<void> {
		const urls = parseUrlList(raw);
		if (urls.length === 0) return;
		running = true;
		if (zipUrl) {
			URL.revokeObjectURL(zipUrl);
			zipUrl = null;
		}
		items = urls.map((url) => ({ url, status: 'pending' }));
		const results: { filename: string; markdown: string }[] = [];
		const settings = await settingsItem.getValue();

		for (let i = 0; i < items.length; i += 1) {
			items[i] = { ...items[i], status: 'fetching' } as BatchItem;
			try {
				const out = await fetchAndConvert(urls[i] ?? '', settings);
				items[i] = {
					...items[i],
					status: 'done',
					filename: out.filename,
				} as BatchItem;
				results.push(out);
			} catch (e) {
				items[i] = {
					...items[i],
					status: 'error',
					error: e instanceof Error ? e.message : String(e),
				} as BatchItem;
			}
			items = [...items];
		}

		if (results.length > 0) {
			const blob = buildZip(results);
			zipUrl = URL.createObjectURL(blob);
		}
		running = false;
	}

	function reset(): void {
		raw = '';
		items = [];
		if (zipUrl) {
			URL.revokeObjectURL(zipUrl);
			zipUrl = null;
		}
	}
</script>

<h1>Batch Markdown Export</h1>
<p class="muted">
	Paste one URL per line. SnipSnip fetches each, extracts the article, and
	bundles the results as a ZIP of Markdown files.
</p>

<label class="stacked">
	URLs
	<textarea
		bind:value={raw}
		rows="10"
		placeholder="https://example.com/article-1
https://example.com/article-2"
		disabled={running}
	></textarea>
</label>

<div class="actions">
	<button
		type="button"
		class="primary"
		onclick={run}
		disabled={running || raw.trim().length === 0}
	>
		{running ? 'Working…' : 'Convert'}
	</button>
	<button type="button" onclick={reset} disabled={running}>Reset</button>
	{#if zipUrl}
		<a class="download" href={zipUrl} download="snipsnip-batch.zip"
		>Download ZIP</a>
	{/if}
</div>

{#if items.length > 0}
	<div class="summary">
		<span><strong>{done}</strong> done</span>
		<span><strong>{failed}</strong> failed</span>
		<span><strong>{total}</strong> total</span>
	</div>

	<ul class="rows">
		{#each items as item, idx (idx)}
			<li class={`status-${item.status}`}>
				<span class="dot" aria-hidden="true"></span>
				<a href={item.url} target="_blank" rel="noreferrer noopener">{
					item.url
				}</a>
				{#if item.filename}<span class="meta">→ {item.filename}</span>{/if}
				{#if item.error}<span class="meta error">{item.error}</span>{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	h1 {
		margin: 0 0 8px;
	}
	p.muted {
		color: var(--muted);
		margin: 0 0 24px;
	}
	label.stacked {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-bottom: 16px;
	}
	textarea {
		width: 100%;
		font-family:
			"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
		padding: 10px;
		background: var(--surface);
		color: var(--fg);
		border: 1px solid var(--border);
		border-radius: 8px;
		resize: vertical;
	}
	.actions {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-bottom: 24px;
	}
	button,
	.download {
		padding: 8px 16px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--surface);
		color: var(--fg);
		cursor: pointer;
		font-weight: 500;
		text-decoration: none;
	}
	.primary {
		background: var(--accent);
		color: var(--bg);
		border-color: var(--accent);
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.download {
		background: var(--success);
		color: var(--bg);
		border-color: var(--success);
	}
	.summary {
		display: flex;
		gap: 16px;
		padding: 8px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 6px;
		margin-bottom: 12px;
		font-size: 13px;
	}
	ul.rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	li {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 10px;
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 13px;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--muted);
		flex-shrink: 0;
	}
	li.status-fetching .dot {
		background: var(--accent);
		animation: pulse 1s ease-in-out infinite;
	}
	li.status-done .dot {
		background: var(--success);
	}
	li.status-error .dot {
		background: var(--danger);
	}
	li a {
		color: var(--fg);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
	}
	li a:hover {
		text-decoration: underline;
	}
	.meta {
		color: var(--muted);
		font-size: 12px;
	}
	.meta.error {
		color: var(--danger);
	}
	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
</style>
