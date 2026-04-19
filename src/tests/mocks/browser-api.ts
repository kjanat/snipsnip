/**
 * Mock implementation of Browser Extension APIs
 * Provides mock objects for chrome.* and browser.* APIs used in the extension
 */

const { mock } = require('bun:test');

// Storage mock
const storageMock = {
	local: {
		_data: {},
		get: mock((keys, callback) => {
			const result = {};
			if (typeof keys === 'string') {
				result[keys] = storageMock.local._data[keys];
			} else if (Array.isArray(keys)) {
				keys.forEach(key => {
					result[key] = storageMock.local._data[key];
				});
			} else if (typeof keys === 'object') {
				Object.keys(keys).forEach(key => {
					result[key] = storageMock.local._data[key] !== undefined
						? storageMock.local._data[key]
						: keys[key];
				});
			}
			if (callback) {
				callback(result);
			}
			return Promise.resolve(result);
		}),
		set: mock((items, callback) => {
			Object.assign(storageMock.local._data, items);
			if (callback) {
				callback();
			}
			return Promise.resolve();
		}),
		remove: mock((keys, callback) => {
			if (typeof keys === 'string') {
				delete storageMock.local._data[keys];
			} else if (Array.isArray(keys)) {
				keys.forEach(key => delete storageMock.local._data[key]);
			}
			if (callback) {
				callback();
			}
			return Promise.resolve();
		}),
		clear: mock((callback) => {
			storageMock.local._data = {};
			if (callback) {
				callback();
			}
			return Promise.resolve();
		}),
		_reset: () => {
			storageMock.local._data = {};
		},
	},
	sync: {
		_data: {},
		get: mock((keys, callback) => {
			const result = {};
			if (typeof keys === 'string') {
				result[keys] = storageMock.sync._data[keys];
			} else if (Array.isArray(keys)) {
				keys.forEach(key => {
					result[key] = storageMock.sync._data[key];
				});
			} else if (typeof keys === 'object') {
				Object.keys(keys).forEach(key => {
					result[key] = storageMock.sync._data[key] !== undefined
						? storageMock.sync._data[key]
						: keys[key];
				});
			}
			if (callback) {
				callback(result);
			}
			return Promise.resolve(result);
		}),
		set: mock((items, callback) => {
			Object.assign(storageMock.sync._data, items);
			if (callback) {
				callback();
			}
			return Promise.resolve();
		}),
		_reset: () => {
			storageMock.sync._data = {};
		},
	},
	onChanged: {
		addListener: mock(),
		removeListener: mock(),
	},
};

// Runtime mock
const runtimeMock = {
	lastError: null,
	id: 'test-extension-id',
	connectNative: mock(() => ({
		postMessage: mock(),
		disconnect: mock(),
		onMessage: {
			addListener: mock(),
			removeListener: mock(),
		},
		onDisconnect: {
			addListener: mock(),
			removeListener: mock(),
		},
	})),
	sendMessage: mock((_message, callback) => {
		if (callback) {
			callback({ success: true });
		}
		return Promise.resolve({ success: true });
	}),
	onMessage: {
		addListener: mock(),
		removeListener: mock(),
		hasListener: mock(),
	},
	getURL: mock((path) => {
		return `chrome-extension://test-extension-id/${path}`;
	}),
	getManifest: mock(() => ({
		name: 'SnipSnip - Markdown Web Clipper',
		version: '4.0.0',
		manifest_version: 3,
	})),
};

// Tabs mock
const tabsMock = {
	_tabs: [],
	query: mock((queryInfo, callback) => {
		let results = tabsMock._tabs;
		if (queryInfo.active) {
			results = results.filter(tab => tab.active);
		}
		if (queryInfo.currentWindow) {
			results = results.filter(tab => tab.windowId === 1);
		}
		if (callback) {
			callback(results);
		}
		return Promise.resolve(results);
	}),
	get: mock((tabId, callback) => {
		const tab = tabsMock._tabs.find(t => t.id === tabId);
		if (callback) {
			callback(tab);
		}
		return Promise.resolve(tab);
	}),
	create: mock((createProperties, callback) => {
		const newTab = {
			id: tabsMock._tabs.length + 1,
			windowId: 1,
			active: createProperties.active !== false,
			url: createProperties.url || 'about:blank',
			title: '',
			...createProperties,
		};
		tabsMock._tabs.push(newTab);
		if (callback) {
			callback(newTab);
		}
		return Promise.resolve(newTab);
	}),
	sendMessage: mock((_tabId, _message, callback) => {
		if (callback) {
			callback({ success: true });
		}
		return Promise.resolve({ success: true });
	}),
	executeScript: mock((_tabId, _details, callback) => {
		if (callback) {
			callback([]);
		}
		return Promise.resolve([]);
	}),
	_reset: () => {
		tabsMock._tabs = [
			{
				id: 1,
				windowId: 1,
				active: true,
				url: 'https://example.com',
				title: 'Example Domain',
			},
		];
	},
};

// Downloads mock
const downloadsMock = {
	_downloads: [],
	download: mock((options, callback) => {
		const downloadId = downloadsMock._downloads.length + 1;
		downloadsMock._downloads.push({
			id: downloadId,
			...options,
		});
		if (callback) {
			callback(downloadId);
		}
		return Promise.resolve(downloadId);
	}),
	_reset: () => {
		downloadsMock._downloads = [];
	},
};

// Context Menus mock
const contextMenusMock = {
	_menus: [],
	create: mock((createProperties, callback) => {
		const menuId = createProperties.id || `menu-${contextMenusMock._menus.length + 1}`;
		contextMenusMock._menus.push({
			...createProperties,
			id: menuId,
		});
		if (callback) {
			callback();
		}
		return menuId;
	}),
	update: mock((id, updateProperties, callback) => {
		const menu = contextMenusMock._menus.find(m => m.id === id);
		if (menu) {
			Object.assign(menu, updateProperties);
		}
		if (callback) {
			callback();
		}
		return Promise.resolve();
	}),
	remove: mock((menuItemId, callback) => {
		contextMenusMock._menus = contextMenusMock._menus.filter(m => m.id !== menuItemId);
		if (callback) {
			callback();
		}
		return Promise.resolve();
	}),
	removeAll: mock((callback) => {
		contextMenusMock._menus = [];
		if (callback) {
			callback();
		}
		return Promise.resolve();
	}),
	onClicked: {
		addListener: mock(),
		removeListener: mock(),
	},
	_reset: () => {
		contextMenusMock._menus = [];
	},
};

// Scripting mock
const scriptingMock = {
	executeScript: mock((_injection) => {
		return Promise.resolve([{ result: null }]);
	}),
	insertCSS: mock((_injection) => {
		return Promise.resolve();
	}),
};

// Clipboard mock
const clipboardMock = {
	writeText: mock((text) => {
		clipboardMock._lastText = text;
		return Promise.resolve();
	}),
	_lastText: null,
	_reset: () => {
		clipboardMock._lastText = null;
	},
};

// Commands mock
const commandsMock = {
	onCommand: {
		addListener: mock(),
		removeListener: mock(),
	},
};

const permissionsMock = {
	contains: mock(() => Promise.resolve(false)),
	request: mock(() => Promise.resolve(true)),
};

// Offscreen mock
const offscreenMock = {
	createDocument: mock((_parameters) => {
		return Promise.resolve();
	}),
	closeDocument: mock(() => {
		return Promise.resolve();
	}),
};

// Main browser API object
const browserAPI = {
	storage: storageMock,
	runtime: runtimeMock,
	tabs: tabsMock,
	downloads: downloadsMock,
	contextMenus: contextMenusMock,
	scripting: scriptingMock,
	clipboard: clipboardMock,
	commands: commandsMock,
	permissions: permissionsMock,
	offscreen: offscreenMock,

	// Helper to reset all mocks
	_resetAll: () => {
		storageMock.local._reset();
		storageMock.sync._reset();
		tabsMock._reset();
		downloadsMock._reset();
		contextMenusMock._reset();
		clipboardMock._reset();
		mock.clearAllMocks();
	},
};

// Initialize with some default data
tabsMock._reset();

export default browserAPI;
