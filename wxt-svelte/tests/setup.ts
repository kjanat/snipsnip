import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

GlobalRegistrator.register({
	url: 'https://example.test/',
	settings: { disableJavaScriptFileLoading: true },
});

export const EXTENSION_PATH = resolve(
	dirname(fileURLToPath(import.meta.resolve('#pkg'))),
	'.output/chrome-mv3',
);
