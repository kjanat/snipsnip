import type { AutoIconsOptions } from '@wxt-dev/auto-icons';
import { env } from 'bun';
import { defineConfig } from 'wxt';

const srcDir = 'src';

const autoIcons: AutoIconsOptions = {
	enabled: true,
	baseIconPath: 'assets/alt-icon-square.svg',
	developmentIndicator: 'overlay',
	sizes: [128, 256, 512],
};

export default defineConfig({
	modules: ['@wxt-dev/module-svelte', '@wxt-dev/auto-icons'],
	srcDir,
	autoIcons,
	targetBrowsers: ['chrome', 'firefox'],
	manifestVersion: 3,
	manifest: {
		name: 'SnipSnip',
		short_name: 'Snip',
		description: env.npm_package_description,
		permissions: [
			'activeTab',
			'clipboardWrite',
			'contextMenus',
			'downloads',
			'notifications',
			'offscreen',
			'scripting',
			'storage',
		],
		optional_permissions: ['nativeMessaging'],
		host_permissions: ['<all_urls>'],
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
		content_security_policy: {
			extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
		},
		browser_specific_settings: {
			gecko: {
				id: 'snipsnip-svelte@kjanat.com',
				strict_min_version: '128.0',
			},
		},
	},
	vite: () => ({
		build: {
			sourcemap: import.meta.env.FIREFOX ? 'inline' : false,
			minify: !import.meta.env.FIREFOX,
			cssMinify: true,
		},
	}),
});
