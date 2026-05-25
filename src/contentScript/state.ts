import type { CaptureState, LinkPickerState } from '@/contentScript/types.ts';

export function createCaptureState(): CaptureState {
	return {
		pageContextLoadPromise: null,
		pageContextScriptLoaded: false,
		pageContextScriptFailed: false,
		lastPageContextFailureAt: 0,
		pageContextRetryCooldownMs: 5000,
		latexAttrName: 'snipsnip-latex',
		mathJaxSyncEventName: 'snipsnip:mathjax-sync',
		mathJaxSyncRequestEventName: 'snipsnip:mathjax-sync-request',
	};
}

export function createLinkPickerState(): LinkPickerState {
	return {
		active: false,
		selectedLinks: new Set<string>(),
		selectedElements: new Set<Element>(),
		hoveredElement: null,
		controlPanel: null,
		styleElement: null,
		handlers: {},
		lastSelectedElement: null,
		accentColors: null,
	};
}

export function getCaptureState(): CaptureState {
	if (typeof window.snipsnipCaptureState === 'undefined') {
		window.snipsnipCaptureState = createCaptureState();
	}

	return window.snipsnipCaptureState;
}

export function getLinkPickerState(): LinkPickerState {
	if (typeof window.linkPickerState === 'undefined') {
		window.linkPickerState = createLinkPickerState();
	}

	return window.linkPickerState;
}
