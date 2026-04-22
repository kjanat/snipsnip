import type { AutoIconsOptions } from '@wxt-dev/auto-icons';
import { defineConfig } from 'wxt';

const autoIcons: AutoIconsOptions = {
	enabled: true,
	baseIconPath: 'assets/alt-icon-square.svg',
	developmentIndicator: 'overlay',
	sizes: [16, 32, 48, 96, 128, 256, 512],
};

export default defineConfig({
	srcDir: 'src',
	modules: ['@wxt-dev/module-svelte', '@wxt-dev/auto-icons'],
	autoIcons,
	targetBrowsers: ['chrome', 'firefox'],
	manifest: ({ browser }) => ({
		name: 'SnipSnip — Markdown Web Clipper',
		short_name: 'SnipSnip',
		author: 'Kaj Kowalski',
		description:
			'One-click Markdown web clipper. Save articles, docs, code & tables as clean Markdown for AI agents & LLMs. Supports Obsidian & more.',
		permissions: [
			'activeTab',
			'downloads',
			'storage',
			'contextMenus',
			'clipboardWrite',
			'notifications',
			'scripting',
			...(browser === 'chrome' ? ['offscreen'] : []),
		],
		optional_permissions: ['nativeMessaging'],
		host_permissions: ['<all_urls>'],
		action: {
			default_title: 'SnipSnip',
			default_popup: 'popup.html',
		},
		options_ui: {
			page: 'options.html',
			open_in_tab: true,
		},
		commands: {
			_execute_action: {
				suggested_key: { default: 'Alt+Shift+M' },
			},
			download_tab_as_markdown: {
				suggested_key: { default: 'Alt+Shift+D' },
				description: 'Save current tab as Markdown',
			},
			copy_tab_as_markdown: {
				suggested_key: { default: 'Alt+Shift+C' },
				description: 'Copy current tab as Markdown to the clipboard',
			},
			copy_tab_as_markdown_link: {
				suggested_key: { default: 'Alt+Shift+L' },
				description: 'Copy current tab URL as Markdown link to the clipboard',
			},
			copy_selection_as_markdown: {
				description: 'Copy current selection as Markdown to the clipboard',
			},
			copy_tab_to_obsidian: {
				description: 'Copy current tab as Markdown to Obsidian',
			},
		},
		web_accessible_resources: [
			{
				resources: ['page-context.js'],
				matches: ['<all_urls>'],
			},
		],
		...(browser === 'firefox'
			? {
				browser_specific_settings: {
					gecko: {
						id: 'snipsnip-svelte@kjanat.com',
						strict_min_version: '128.0',
					},
				},
			}
			: {}),
	}),
	vite: () => ({
		build: {
			sourcemap: 'inline',
			minify: false,
		},
	}),
});
