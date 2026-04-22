/// <reference types="bun" />

declare module 'pdfmake/build/pdfmake' {
	import type { TDocumentDefinitions } from 'pdfmake/interfaces';

	interface CreatedPdf {
		getBlob(callback: (blob: Blob) => void): void;
		getBuffer(callback: (buffer: Uint8Array) => void): void;
		getBase64(callback: (base64: string) => void): void;
		download(filename?: string, callback?: () => void): void;
		open(): void;
		print(): void;
	}

	interface PdfMakeStatic {
		vfs: Record<string, string>;
		fonts?: Record<
			string,
			{ normal?: string; bold?: string; italics?: string; bolditalics?: string }
		>;
		createPdf(definition: TDocumentDefinitions): CreatedPdf;
	}

	const pdfMake: PdfMakeStatic;
	export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
	const fonts: { pdfMake: { vfs: Record<string, string> } };
	export default fonts;
}

declare module 'turndown-plugin-gfm' {
	import type TurndownService from 'turndown';
	type Plugin = (service: TurndownService) => void;
	export const gfm: Plugin;
	export const tables: Plugin;
	export const strikethrough: Plugin;
	export const taskListItems: Plugin;
}
