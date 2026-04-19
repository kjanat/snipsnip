import browserApi from '../../browser-polyfill.min.ts';

let contentRuntimeLoadPromise: Promise<void> | null = null;

export interface ContentRuntimeBootstrapOptions {
	importModule?: () => Promise<unknown>;
}

export async function bootContentScriptRuntime(options: ContentRuntimeBootstrapOptions = {}): Promise<void> {
	globalThis.browser ??= browserApi;

	if (!contentRuntimeLoadPromise) {
		const importModule = options.importModule ?? (() => import('../../contentScript/contentScript.ts'));
		contentRuntimeLoadPromise = importModule().then(() => undefined);
	}

	await contentRuntimeLoadPromise;
}
