/// <reference types="bun" />

declare module 'pdfmake/build/pdfmake' {
	import type { TDocumentDefinitions } from 'pdfmake/interfaces';

	interface CreatedPdf {
		getBlob(): Promise<Blob>;
		getBuffer(): Promise<Uint8Array>;
		getBase64(): Promise<string>;
		getDataUrl(): Promise<string>;
		download(filename?: string): Promise<void>;
		open(win?: Window | null): Promise<void>;
		print(): Promise<void>;
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
