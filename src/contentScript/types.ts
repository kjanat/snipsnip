export type SelectionAndDom = {
	selection: string;
	dom: string;
	pageUrl: string;
};

export type CaptureState = {
	pageContextLoadPromise: Promise<boolean> | null;
	pageContextScriptLoaded: boolean;
	pageContextScriptFailed: boolean;
	lastPageContextFailureAt: number;
	pageContextRetryCooldownMs: number;
	latexAttrName: string;
	mathJaxSyncEventName: string;
	mathJaxSyncRequestEventName: string;
};

export type AccentColors = {
	dark: string;
	darker: string;
	base: string;
};

export type LinkPickerHandlers = {
	mousemove?: (event: MouseEvent) => void;
	click?: (event: MouseEvent) => void;
	keydown?: (event: KeyboardEvent) => void;
};

export type LinkPickerState = {
	active: boolean;
	selectedLinks: Set<string>;
	selectedElements: Set<Element>;
	hoveredElement: Element | null;
	controlPanel: HTMLDivElement | null;
	styleElement: HTMLStyleElement | null;
	handlers: LinkPickerHandlers;
	lastSelectedElement: Element | null;
	accentColors: AccentColors | null;
};

export type LinkPickerActivationMessage = {
	type: 'ACTIVATE_LINK_PICKER';
};

export type LinkPickerCompleteMessage = {
	type: 'LINK_PICKER_COMPLETE';
	links: string[];
};

export type ClipMessage = {
	type: 'clip';
	dom: string;
	selection: string;
	pageUrl: string;
};

export type MessageWithType = {
	type: string;
};

export type AccentKey = 'sage' | 'ocean' | 'slate' | 'rose' | 'amber';

declare global {
	interface Window {
		snipsnipCaptureState?: CaptureState;
		linkPickerState?: LinkPickerState;
		linkPickerMessageListenerAdded?: boolean;
	}
	var getSelectionAndDom: (() => SelectionAndDom | null) | undefined;
	var snipsnipPrepareForCapture: (() => Promise<void>) | undefined;
}
