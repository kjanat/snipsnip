import { afterEach, describe, expect, mock, test } from 'bun:test';

import { bootContentScriptRuntime } from '@/lib/content/bootstrap';

const originalBrowser = globalThis.browser;

afterEach(() => {
	globalThis.browser = originalBrowser;
});

describe('content runtime bootstrap', () => {
	test('sets browser global and dedupes module loading', async () => {
		globalThis.browser = undefined;
		const importModule = mock(async () => ({}));

		await Promise.all([
			bootContentScriptRuntime({ importModule }),
			bootContentScriptRuntime({ importModule }),
		]);

		expect(importModule).toHaveBeenCalledTimes(1);
	});
});
