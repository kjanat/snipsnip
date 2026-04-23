import { type ContextFormatter, createContext } from '@dprint/formatter';

let cached: ContextFormatter | null = null;

async function getFormatter(): Promise<ContextFormatter> {
	if (cached) return cached;
	const ctx = createContext({ lineWidth: 120 });
	const url = browser.runtime.getURL('/dprint-markdown.wasm');
	const response = await fetch(url);
	cached = await ctx.addPluginStreaming(response, {
		textWrap: 'never',
	});
	return cached;
}

export async function formatMarkdown(text: string): Promise<string> {
	const fmt = await getFormatter();
	return fmt.formatText({ filePath: 'output.md', fileText: text });
}
