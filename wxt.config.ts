import { AutoIconsOptions } from '@wxt-dev/auto-icons';
import { defineConfig } from 'wxt';

const autoIcons: AutoIconsOptions = {
	enabled: true,
	baseIconPath: 'assets/icon.png',
	developmentIndicator: 'overlay',
	sizes: [16, 32, 48, 128, 192, 256, 512],
};

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ['@wxt-dev/auto-icons'],
	srcDir: 'src',
	publicDir: 'src/public',
	autoIcons,
	targetBrowsers: ['chrome', 'firefox'],
	manifest: ({ browser }) => ({
		name: 'SnipSnip - Markdown Web Clipper',
		author: 'Kaj Kowalski',
		description:
			'One-click Markdown web clipper. Save articles, docs, code & tables as clean Markdown for AI agents & LLMs. Supports Obsidian & more.',
		permissions: [
			'activeTab',
			'downloads',
			'storage',
			'contextMenus',
			'clipboardWrite',
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
			browser_style: false,
			open_in_tab: true,
		},
		commands: {
			_execute_action: {
				suggested_key: {
					default: 'Alt+Shift+M',
				},
			},
			download_tab_as_markdown: {
				suggested_key: {
					default: 'Alt+Shift+D',
				},
				description: 'Save current tab as Markdown',
			},
			copy_tab_as_markdown: {
				suggested_key: {
					default: 'Alt+Shift+C',
				},
				description: 'Copy current tab as Markdown to the clipboard',
			},
			copy_selection_as_markdown: {
				description: 'Copy current selection as Markdown to the clipboard',
			},
			copy_tab_as_markdown_link: {
				suggested_key: {
					default: 'Alt+Shift+L',
				},
				description: 'Copy current tab URL as Markdown link to the clipboard',
			},
			copy_selected_tab_as_markdown_link: {
				description: 'Copy selected tabs URL as Markdown link to the clipboard',
			},
			copy_selection_to_obsidian: {
				description: 'Copy current selection as Markdown to Obsidian',
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
						id: 'snipsnip@kjanat.com',
						strict_min_version: '150.0',
						data_collection_permissions: {
							required: ['none'],
						},
					},
				},
			}
			: {}),
	}),
});
