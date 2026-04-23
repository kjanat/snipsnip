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

	interface PdfMakeInstance {
		addVirtualFileSystem(vfs: Record<string, string>): void;
		addFonts(fonts: Record<string, Record<string, string>>): void;
		createPdf(definition: TDocumentDefinitions): CreatedPdf;
	}

	const pdfMake: PdfMakeInstance;
	export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
	const vfs: Record<string, string>;
	export default vfs;
}

declare module 'turndown-plugin-gfm' {
	import type TurndownService from 'turndown';
	type Plugin = (service: TurndownService) => void;
	export const gfm: Plugin;
	export const tables: Plugin;
	export const strikethrough: Plugin;
	export const taskListItems: Plugin;
}
