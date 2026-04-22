<script lang="ts">
	import {
		DEFAULT_SETTINGS,
		parseSettings,
		safeParseSettings,
	} from '@/lib/defaults';
	import { getSettings, settingsItem } from '@/lib/storage';
	import type { ClipSettings } from '@/lib/types';
	import { onMount } from 'svelte';

	let settings = $state<ClipSettings>({ ...DEFAULT_SETTINGS });
	let saved = $state(false);
	let loading = $state(true);
	let importError = $state<string | null>(null);

	onMount(async () => {
		settings = await getSettings();
		loading = false;
	});

	async function save(): Promise<void> {
		await settingsItem.setValue(safeParseSettings($state.snapshot(settings)));
		saved = true;
		setTimeout(() => (saved = false), 1500);
	}

	async function reset(): Promise<void> {
		settings = { ...DEFAULT_SETTINGS };
		await save();
	}

	function exportSettings(): void {
		const blob = new Blob([JSON.stringify(settings, null, 2)], {
			type: 'application/json',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'snipsnip-settings.json';
		a.click();
		URL.revokeObjectURL(url);
	}

	async function importSettings(event: Event): Promise<void> {
		const target = event.target;
		if (!(target instanceof HTMLInputElement)) return;
		const file = target.files?.[0];
		if (!file) return;
		try {
			settings = parseSettings(JSON.parse(await file.text()));
			importError = null;
			await save();
		} catch (e) {
			importError = e instanceof Error ? e.message : 'Invalid settings file.';
		}
	}
</script>

<h1>SnipSnip Settings</h1>

{#if loading}
	<p class="muted">Loading…</p>
{:else}
	<section>
		<h2>Markdown</h2>
		<div class="grid">
			<label>
				Heading style
				<select bind:value={settings.headingStyle}>
					<option value="atx"># ATX</option>
					<option value="setext">Setext</option>
				</select>
			</label>
			<label>
				Bullet marker
				<select bind:value={settings.bulletListMarker}>
					<option value="-">-</option>
					<option value="*">*</option>
					<option value="+">+</option>
				</select>
			</label>
			<label>
				Code block style
				<select bind:value={settings.codeBlockStyle}>
					<option value="fenced">Fenced</option>
					<option value="indented">Indented</option>
				</select>
			</label>
			<label>
				Fence
				<select bind:value={settings.fence}>
					<option value="```">```</option>
					<option value="~~~">~~~</option>
				</select>
			</label>
			<label>
				Emphasis
				<select bind:value={settings.emDelimiter}>
					<option value="_">_underscore_</option>
					<option value="*">*asterisk*</option>
				</select>
			</label>
			<label>
				Strong
				<select bind:value={settings.strongDelimiter}>
					<option value="**">**asterisks**</option>
					<option value="__">__underscores__</option>
				</select>
			</label>
			<label>
				Link style
				<select bind:value={settings.linkStyle}>
					<option value="inlined">Inlined</option>
					<option value="referenced">Referenced</option>
				</select>
			</label>
			<label>
				Images
				<select bind:value={settings.imageStyle}>
					<option value="markdown">Markdown</option>
					<option value="noImage">Strip images</option>
					<option value="obsidian">Obsidian embed</option>
					<option value="obsidian-nofolder">Obsidian embed (flat)</option>
				</select>
			</label>
		</div>
	</section>

	<section>
		<h2>Template</h2>
		<label class="inline">
			<input type="checkbox" bind:checked={settings.includeTemplate}>
			Include frontmatter / backmatter
		</label>
		<label class="stacked">
			Filename template
			<input type="text" bind:value={settings.title}>
		</label>
		<label class="stacked">
			Frontmatter
			<textarea rows="6" bind:value={settings.frontmatter}></textarea>
		</label>
		<label class="stacked">
			Backmatter
			<textarea rows="3" bind:value={settings.backmatter}></textarea>
		</label>
		<p class="muted small">
			Tokens: <code>{'{pageTitle}'}</code> <code>{'{baseURI}'}</code>
			<code>{'{byline}'}</code> <code>{'{publishedTime}'}</code>
			<code>{'{excerpt}'}</code> <code>{'{siteName}'}</code>
			<code>{'{hash}'}</code> <code>{'{date:YYYY-MM-DD}'}</code>
		</p>
	</section>

	<section>
		<h2>Downloads &amp; Obsidian</h2>
		<label class="inline">
			<input type="checkbox" bind:checked={settings.saveAs}>
			Prompt "Save As…" dialog on download
		</label>
		<label class="stacked">
			Obsidian vault
			<input
				type="text"
				bind:value={settings.obsidianVault}
				placeholder="MyVault"
			>
		</label>
		<label class="stacked">
			Obsidian folder
			<input
				type="text"
				bind:value={settings.obsidianFolder}
				placeholder="Clips"
			>
		</label>
	</section>

	<section>
		<h2>Agent Bridge</h2>
		<p class="muted small">
			Connect a native companion (CLI, MCP server, etc.) to read clips on
			demand. Requires a registered native messaging host on this machine.
		</p>
		<label class="inline">
			<input type="checkbox" bind:checked={settings.agentBridgeEnabled}>
			Enable Agent Bridge
		</label>
		<label class="stacked">
			Native host name
			<input
				type="text"
				bind:value={settings.agentBridgeHost}
				placeholder="com.snipsnip.bridge"
			>
		</label>
	</section>

	<section>
		<h2>Notifications &amp; History</h2>
		<label class="inline">
			<input type="checkbox" bind:checked={settings.notificationsEnabled}>
			Show desktop notifications on clip save / failure
		</label>
		<label class="stacked">
			History limit (number of clips kept in Library)
			<input type="number" min="1" max="500" bind:value={settings.historyLimit}>
		</label>
	</section>

	<section>
		<h2>Site Rules</h2>
		<p class="muted small">
			Override Readability for specific hostnames. <code>*</code> wildcards
			allowed. Content selector picks the article root; exclude selectors strip
			noise (comma-separated).
		</p>
		{#each settings.siteRules as rule, idx (idx)}
			<div class="rule">
				<input
					type="text"
					bind:value={rule.pattern}
					placeholder="*.example.com"
				>
				<input
					type="text"
					bind:value={rule.contentSelector}
					placeholder="article, main"
				>
				<input
					type="text"
					bind:value={rule.excludeSelectors}
					placeholder=".ads, .footer"
				>
				<button
					type="button"
					class="rule-remove"
					onclick={() => (settings.siteRules = settings.siteRules.filter((_, i) => i !== idx))}
					aria-label="Remove rule"
				>
					×
				</button>
			</div>
		{/each}
		<button
			type="button"
			onclick={() => (settings.siteRules = [...settings.siteRules, {
				pattern: '',
				contentSelector: '',
				excludeSelectors: '',
			}])}
		>
			Add rule
		</button>
	</section>

	<footer>
		<button type="button" class="primary" onclick={save}>
			{saved ? 'Saved ✓' : 'Save'}
		</button>
		<button type="button" onclick={reset}>Reset to defaults</button>
		<button type="button" onclick={exportSettings}>Export JSON</button>
		<label class="file">
			Import JSON
			<input
				type="file"
				accept="application/json"
				onchange={importSettings}
				hidden
			>
		</label>
	</footer>
	{#if importError}
		<p class="import-error" role="alert">Import failed: {importError}</p>
	{/if}
{/if}

<style>
	h1 {
		margin: 0 0 24px;
		font-size: 24px;
	}
	h2 {
		margin: 0 0 12px;
		font-size: 16px;
		font-weight: 600;
	}
	section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 20px;
		margin-bottom: 20px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 12px 16px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		color: var(--muted);
	}
	label.inline {
		flex-direction: row;
		align-items: center;
		gap: 8px;
		color: var(--fg);
		margin-bottom: 12px;
	}
	label.stacked {
		margin-bottom: 12px;
	}
	input[type="text"],
	select,
	textarea {
		font: inherit;
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--fg);
	}
	textarea {
		font-family:
			"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 12px;
	}
	.small {
		font-size: 12px;
	}
	.muted {
		color: var(--muted);
	}
	code {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 1px 4px;
		font-family:
			"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 11px;
	}
	footer {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	footer button,
	.file {
		padding: 8px 14px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--fg);
		cursor: pointer;
		font-weight: 500;
	}
	footer .primary {
		background: var(--accent);
		color: var(--bg);
		border-color: var(--accent);
	}
	.file {
		display: inline-flex;
		align-items: center;
	}
	.import-error {
		margin: 12px 0 0;
		padding: 8px 12px;
		border: 1px solid var(--danger);
		border-radius: 6px;
		color: var(--danger);
		background: color-mix(in srgb, var(--danger) 10%, transparent);
	}
	.rule {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr auto;
		gap: 6px;
		margin-bottom: 8px;
	}
	.rule input {
		font: inherit;
		padding: 6px 8px;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--fg);
	}
	.rule-remove {
		padding: 0 12px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--danger);
		border-radius: 6px;
		cursor: pointer;
		font-size: 18px;
	}
</style>
