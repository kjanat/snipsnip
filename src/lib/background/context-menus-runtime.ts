import { getOptions } from './default-options-runtime.ts';

function getContextMenusApi() {
	return globalThis.browser?.contextMenus;
}

function safeCreate(details) {
	getContextMenusApi()?.create?.(details, () => {});
}

export async function createMenus() {
	const options = await getOptions();
	const contextMenusApi = getContextMenusApi();

	contextMenusApi?.removeAll?.();

	if (!options.contextMenus) {
		return;
	}

	try {
		safeCreate({
			id: 'download-markdown-tab',
			title: 'Download Tab as Markdown',
			contexts: ['tab'],
		});

		safeCreate({
			id: 'tab-download-markdown-alltabs',
			title: 'Download All Tabs as Markdown',
			contexts: ['tab'],
		});

		safeCreate({
			id: 'copy-tab-as-markdown-link-tab',
			title: 'Copy Tab URL as Markdown Link',
			contexts: ['tab'],
		});

		safeCreate({
			id: 'copy-tab-as-markdown-link-all-tab',
			title: 'Copy All Tab URLs as Markdown Link List',
			contexts: ['tab'],
		});

		safeCreate({
			id: 'copy-tab-as-markdown-link-selected-tab',
			title: 'Copy Selected Tab URLs as Markdown Link List',
			contexts: ['tab'],
		});

		safeCreate({
			id: 'tab-separator-1',
			type: 'separator',
			contexts: ['tab'],
		});

		safeCreate({
			id: 'tabtoggle-includeTemplate',
			type: 'checkbox',
			title: 'Include front/back template',
			contexts: ['tab'],
			checked: options.includeTemplate,
		});

		safeCreate({
			id: 'tabtoggle-downloadImages',
			type: 'checkbox',
			title: 'Download Images',
			contexts: ['tab'],
			checked: options.downloadImages,
		});
	} catch {
	}

	safeCreate({
		id: 'download-markdown-alltabs',
		title: 'Download All Tabs as Markdown',
		contexts: ['all'],
	});
	safeCreate({
		id: 'separator-0',
		type: 'separator',
		contexts: ['all'],
	});
	safeCreate({
		id: 'download-markdown-selection',
		title: 'Download Selection As Markdown',
		contexts: ['selection'],
	});
	safeCreate({
		id: 'download-markdown-all',
		title: 'Download Tab As Markdown',
		contexts: ['all'],
	});
	safeCreate({
		id: 'separator-1',
		type: 'separator',
		contexts: ['all'],
	});
	safeCreate({
		id: 'copy-markdown-selection',
		title: 'Copy Selection As Markdown',
		contexts: ['selection'],
	});
	safeCreate({
		id: 'copy-markdown-link',
		title: 'Copy Link As Markdown',
		contexts: ['link'],
	});
	safeCreate({
		id: 'copy-markdown-image',
		title: 'Copy Image As Markdown',
		contexts: ['image'],
	});
	safeCreate({
		id: 'copy-markdown-all',
		title: 'Copy Tab As Markdown',
		contexts: ['all'],
	});
	safeCreate({
		id: 'copy-tab-as-markdown-link',
		title: 'Copy Tab URL as Markdown Link',
		contexts: ['all'],
	});
	safeCreate({
		id: 'copy-tab-as-markdown-link-all',
		title: 'Copy All Tab URLs as Markdown Link List',
		contexts: ['all'],
	});
	safeCreate({
		id: 'copy-tab-as-markdown-link-selected',
		title: 'Copy Selected Tab URLs as Markdown Link List',
		contexts: ['all'],
	});
	safeCreate({
		id: 'separator-2',
		type: 'separator',
		contexts: ['all'],
	});

	if (options.obsidianIntegration) {
		safeCreate({
			id: 'copy-markdown-obsidian',
			title: 'Send Text selection to Obsidian',
			contexts: ['selection'],
		});
		safeCreate({
			id: 'copy-markdown-obsall',
			title: 'Send Tab to Obsidian',
			contexts: ['all'],
		});
	}

	safeCreate({
		id: 'separator-3',
		type: 'separator',
		contexts: ['all'],
	});
	safeCreate({
		id: 'toggle-includeTemplate',
		type: 'checkbox',
		title: 'Include front/back template',
		contexts: ['all'],
		checked: options.includeTemplate,
	});
	safeCreate({
		id: 'toggle-downloadImages',
		type: 'checkbox',
		title: 'Download Images',
		contexts: ['all'],
		checked: options.downloadImages,
	});
}
