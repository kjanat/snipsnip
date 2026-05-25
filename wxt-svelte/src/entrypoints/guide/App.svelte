<script lang="ts">
	import { libraryItem } from '@/lib/library-store';
	import { settingsItem } from '@/lib/storage';
	import type { ClipSettings } from '@/lib/types';
	import { onMount } from 'svelte';

	const HOTKEYS = [
		{ keys: ['Alt', 'Shift', 'M'], label: 'Open popup' },
		{ keys: ['Alt', 'Shift', 'D'], label: 'Save current tab as Markdown' },
		{ keys: ['Alt', 'Shift', 'C'], label: 'Copy current tab as Markdown' },
		{ keys: ['Alt', 'Shift', 'L'], label: 'Copy tab URL as Markdown link' },
	] as const;

	const PAGES = [
		{
			id: 'options' as const,
			label: 'Settings',
			blurb: 'Markdown options, templates, Obsidian, Agent Bridge, site rules',
		},
		{
			id: 'batch' as const,
			label: 'Batch processor',
			blurb: 'Convert a list of URLs into a ZIP of Markdown files',
		},
		{
			id: 'library' as const,
			label: 'Library',
			blurb: 'Search and re-export everything you’ve clipped',
		},
	] as const;

	const version = browser.runtime.getManifest().version;

	let settings = $state<ClipSettings | null>(null);
	let clipCount = $state<number | null>(null);

	onMount(() => {
		const unsubSettings = settingsItem.watch((next) => {
			settings = next;
		});
		const unsubLibrary = libraryItem.watch((next) => {
			clipCount = next.length;
		});
		void Promise.all([settingsItem.getValue(), libraryItem.getValue()]).then(
			([s, lib]) => {
				settings = s;
				clipCount = lib.length;
			},
		);
		return () => {
			unsubSettings();
			unsubLibrary();
		};
	});

	function open(page: 'options' | 'batch' | 'library'): void {
		if (page === 'options') {
			browser.runtime.openOptionsPage();
			return;
		}
		void browser.tabs.create({
			url: browser.runtime.getURL(
				page === 'batch' ? '/batch.html' : '/library.html',
			),
		});
	}
</script>

<main>
	<header>
		<h1>SnipSnip <span class="version">v{version}</span></h1>
		<p class="tagline">Markdown web clipper for Chrome &amp; Firefox.</p>
	</header>

	<section>
		<h2>Get started</h2>
		<ol>
			<li>Open any article and click the SnipSnip toolbar icon.</li>
			<li>
				Pick <strong>Document</strong> for the full page or <strong
				>Selection</strong> for a highlight.
			</li>
			<li>
				Edit the markdown if you want, then <strong>Copy</strong>, <strong
				>Download</strong>, or send to <strong>Obsidian</strong>.
			</li>
		</ol>
	</section>

	<section>
		<h2>Hotkeys</h2>
		<ul class="kbd-list">
			{#each HOTKEYS as hotkey (hotkey.label)}
				<li>
					{#each hotkey.keys as key, i (i)}{#if i > 0}+{/if}<kbd>{
							key
						}</kbd>{/each}
					· {hotkey.label}
				</li>
			{/each}
		</ul>
		<p class="muted">
			Customize at <code>chrome://extensions/shortcuts</code> or <code
			>about:addons</code> → Manage Extension Shortcuts.
		</p>
	</section>

	<section>
		<h2>Pages</h2>
		<ul class="links">
			{#each PAGES as page (page.id)}
				<li>
					<button type="button" class="link" onclick={() => open(page.id)}>
						{page.label}
					</button>
					— {page.blurb}
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>Status</h2>
		{#if settings}
			<dl>
				<dt>Notifications</dt>
				<dd>{settings.notificationsEnabled ? 'on' : 'off'}</dd>
				<dt>Agent Bridge</dt>
				<dd>
					{#if settings.agentBridgeEnabled}
						enabled · <code>{settings.agentBridgeHost}</code>
					{:else}
						disabled
					{/if}
				</dd>
				<dt>Obsidian vault</dt>
				<dd>{settings.obsidianVault || '—'}</dd>
				<dt>Site rules</dt>
				<dd>{settings.siteRules.length} configured</dd>
				<dt>History limit</dt>
				<dd>{settings.historyLimit} clips</dd>
				<dt>Clips saved</dt>
				<dd>{clipCount ?? '…'}</dd>
			</dl>
		{:else}
			<p class="muted">Loading…</p>
		{/if}
	</section>

	<footer>
		<p class="muted">SnipSnip · WXT + Svelte 5 rebuild</p>
	</footer>
</main>

<style>
	main {
		max-width: 720px;
		padding: 48px 24px 64px;
		margin: 0 auto;
	}
	header {
		margin-bottom: 32px;
	}
	h1 {
		margin: 0 0 8px;
		font-size: 36px;
		letter-spacing: -0.02em;
	}
	.version {
		font-size: 14px;
		font-weight: 400;
		color: var(--muted);
		margin-left: 6px;
	}
	.tagline {
		margin: 0;
		font-size: 17px;
		color: var(--muted);
	}
	section {
		padding: 24px;
		margin-bottom: 16px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
	}
	h2 {
		margin: 0 0 12px;
		font-size: 18px;
	}
	ol,
	ul {
		padding-left: 22px;
		margin: 0;
	}
	li {
		margin: 4px 0;
	}
	.kbd-list,
	.links {
		padding: 0;
		list-style: none;
	}
	kbd {
		display: inline-block;
		min-width: 24px;
		padding: 2px 6px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: "JetBrains Mono", ui-monospace, monospace;
		font-size: 12px;
		text-align: center;
	}
	code {
		padding: 1px 5px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: "JetBrains Mono", ui-monospace, monospace;
		font-size: 13px;
	}
	.muted {
		font-size: 13px;
		color: var(--muted);
	}
	footer {
		margin-top: 24px;
		text-align: center;
	}
	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 6px 16px;
		margin: 0;
	}
	dt {
		font-weight: 600;
		color: var(--muted);
	}
	dd {
		margin: 0;
	}
	button.link {
		appearance: none;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		font-weight: 600;
		color: var(--accent);
		cursor: pointer;
	}
	button.link:hover {
		text-decoration: underline;
	}
</style>
