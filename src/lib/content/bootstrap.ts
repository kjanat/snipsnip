let contentRuntimeLoadPromise: Promise<void> | null = null;

export interface ContentRuntimeBootstrapOptions {
	importModule?: () => Promise<unknown>;
}

export async function bootContentScriptRuntime(options: ContentRuntimeBootstrapOptions = {}): Promise<void> {
	if (!contentRuntimeLoadPromise) {
		const importModule = options.importModule ?? (() => import('@/contentScript/contentScript'));
		contentRuntimeLoadPromise = importModule().then(() => undefined);
	}

	await contentRuntimeLoadPromise;
}
