export async function downloadMarkdown(
	markdown: string,
	filename: string,
	saveAs: boolean,
): Promise<number> {
	const blob = new Blob([markdown], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	return browser.downloads.download({ url, filename, saveAs });
}
