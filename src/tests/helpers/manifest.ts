import wxtConfig from '@@/wxt.config.ts';

type Browser = 'chrome' | 'firefox';

export async function buildExpectedManifest(browser: Browser = 'chrome'): Promise<Record<string, unknown>> {
	const manifestField = wxtConfig.manifest;
	if (typeof manifestField === 'function') {
		const result = await manifestField({ browser, manifestVersion: 3, command: 'build', mode: 'production' });
		return result as Record<string, unknown>;
	}
	if (manifestField != null && typeof manifestField === 'object') {
		return manifestField as Record<string, unknown>;
	}
	throw new Error('wxt.config.ts has no manifest definition');
}
