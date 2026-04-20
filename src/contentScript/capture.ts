import { getCaptureState } from '@/contentScript/state.ts';
import type { ClipMessage, SelectionAndDom } from '@/contentScript/types.ts';

function getDocumentRoot(): HTMLElement {
	return document.body ?? document.documentElement;
}

function getHTMLOfDocument(): string {
	const clonedDocument = new DOMParser().parseFromString(document.documentElement.outerHTML, 'text/html');

	if (clonedDocument.head.getElementsByTagName('title').length === 0) {
		const titleEl = clonedDocument.createElement('title');
		titleEl.innerText = document.title;
		clonedDocument.head.append(titleEl);
	}

	const baseEls = clonedDocument.head.getElementsByTagName('base');
	let baseEl: HTMLBaseElement;

	if (baseEls.length > 0) {
		baseEl = baseEls[0];
	} else {
		baseEl = clonedDocument.createElement('base');
		clonedDocument.head.append(baseEl);
	}

	const href = baseEl.getAttribute('href');
	if (!href?.startsWith(window.location.origin)) {
		baseEl.setAttribute('href', window.location.href);
	}

	if (document.body && clonedDocument.body) {
		removeHiddenNodes(document.body, clonedDocument.body);
	}

	return clonedDocument.documentElement.outerHTML;
}

function removeHiddenNodes(sourceRoot: Element, clonedRoot: Element): Element {
	const sourceChildren = Array.from(sourceRoot.children);
	const clonedChildren = Array.from(clonedRoot.children);

	for (let i = sourceChildren.length - 1; i >= 0; i--) {
		const sourceChild = sourceChildren[i];
		const clonedChild = clonedChildren[i];
		if (!sourceChild || !clonedChild) {
			continue;
		}

		const nodeName = sourceChild.nodeName.toLowerCase();
		if (nodeName === 'script' || nodeName === 'style' || nodeName === 'noscript' || nodeName === 'math') {
			continue;
		}

		const computedStyle = window.getComputedStyle(sourceChild, null);
		if (
			computedStyle.getPropertyValue('visibility') === 'hidden'
			|| computedStyle.getPropertyValue('display') === 'none'
		) {
			clonedChild.remove();
			continue;
		}

		removeHiddenNodes(sourceChild, clonedChild);
	}

	return clonedRoot;
}

function getHTMLOfSelection(): string {
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) {
		return '';
	}

	let content = '';
	for (let i = 0; i < selection.rangeCount; i++) {
		const range = selection.getRangeAt(i);
		const clonedSelection = range.cloneContents();
		const div = document.createElement('div');
		div.appendChild(clonedSelection);
		content += div.innerHTML;
	}

	return content;
}

function hasRenderedMathJaxNodes(): boolean {
	return !!document.querySelector('mjx-container, .MathJax, script[id^="MathJax-Element-"]');
}

function hasLatexTaggedMath(): boolean {
	return !!document.querySelector(`[${getCaptureState().latexAttrName}]`);
}

function requestMathJaxSyncFromPageContext(): void {
	try {
		window.dispatchEvent(new CustomEvent(getCaptureState().mathJaxSyncRequestEventName));
	} catch (_error) {
		// Cross-context event dispatch can fail. Ignore.
	}
}

function loadPageContextScript(): Promise<boolean> {
	const captureState = getCaptureState();
	if (captureState.pageContextScriptLoaded) {
		return Promise.resolve(true);
	}

	if (captureState.pageContextScriptFailed) {
		const elapsedSinceFailure = Date.now() - captureState.lastPageContextFailureAt;
		if (elapsedSinceFailure < captureState.pageContextRetryCooldownMs) {
			return Promise.resolve(false);
		}
		captureState.pageContextScriptFailed = false;
	}

	if (captureState.pageContextLoadPromise) {
		return captureState.pageContextLoadPromise;
	}

	if (typeof browser === 'undefined' || !browser.runtime?.getURL) {
		return Promise.resolve(false);
	}

	captureState.pageContextLoadPromise = new Promise((resolve: (value: boolean) => void) => {
		let settled = false;
		const settle = (value: boolean) => {
			if (settled) {
				return;
			}
			settled = true;
			if (!value) {
				captureState.pageContextLoadPromise = null;
			}
			resolve(value);
		};

		const existingScript = document.querySelector<HTMLScriptElement>('script[data-snipsnip-page-context="true"]');
		if (existingScript) {
			if (existingScript.getAttribute('data-snipsnip-page-context-loaded') === 'true') {
				captureState.pageContextScriptLoaded = true;
				settle(true);
				return;
			}

			if (existingScript.getAttribute('data-snipsnip-page-context-failed') === 'true') {
				settle(false);
				return;
			}

			existingScript.addEventListener('load', () => {
				captureState.pageContextScriptLoaded = true;
				settle(true);
			}, { once: true });
			existingScript.addEventListener('error', () => {
				captureState.pageContextScriptFailed = true;
				captureState.lastPageContextFailureAt = Date.now();
				settle(false);
			}, { once: true });

			setTimeout(() => settle(false), 1000);
			return;
		}

		const script = document.createElement('script');
		script.src = browser.runtime.getURL('/page-context.js');
		script.setAttribute('data-snipsnip-page-context', 'true');
		script.onload = () => {
			captureState.pageContextScriptLoaded = true;
			captureState.pageContextScriptFailed = false;
			script.setAttribute('data-snipsnip-page-context-loaded', 'true');
			settle(true);
		};
		script.onerror = () => {
			captureState.pageContextScriptFailed = true;
			captureState.lastPageContextFailureAt = Date.now();
			script.setAttribute('data-snipsnip-page-context-failed', 'true');
			settle(false);
		};

		setTimeout(() => {
			if (!captureState.pageContextScriptLoaded) {
				settle(false);
			}
		}, 1000);

		(document.head ?? document.documentElement).appendChild(script);
	});

	return captureState.pageContextLoadPromise;
}

function delay(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForMathJaxLatexTagging(timeoutMs = 1400, pollIntervalMs = 70): Promise<boolean> {
	if (hasLatexTaggedMath()) {
		return true;
	}

	if (!hasRenderedMathJaxNodes()) {
		return false;
	}

	let syncedAtLeastOnce = false;
	const syncListener = () => {
		syncedAtLeastOnce = true;
	};

	window.addEventListener(getCaptureState().mathJaxSyncEventName, syncListener);

	try {
		const startedAt = Date.now();
		while (Date.now() - startedAt < timeoutMs) {
			requestMathJaxSyncFromPageContext();
			await delay(pollIntervalMs);

			if (hasLatexTaggedMath()) {
				return true;
			}

			if (syncedAtLeastOnce && !hasRenderedMathJaxNodes()) {
				break;
			}
		}
	} finally {
		window.removeEventListener(getCaptureState().mathJaxSyncEventName, syncListener);
	}

	return hasLatexTaggedMath();
}

export async function snipsnipPrepareForCapture(): Promise<void> {
	try {
		if (!hasRenderedMathJaxNodes() && !hasLatexTaggedMath()) {
			return;
		}

		await loadPageContextScript();
		await waitForMathJaxLatexTagging();
	} catch (error) {
		console.debug('snipsnipPrepareForCapture failed:', error);
	}
}

export function getSelectionAndDom(): SelectionAndDom | null {
	try {
		const dom = getHTMLOfDocument();
		const selection = getHTMLOfSelection();

		if (!dom) {
			console.error('Failed to get document HTML');
			return null;
		}

		return {
			selection,
			dom,
			pageUrl: window.location.href,
		};
	} catch (error) {
		console.error('Error in getSelectionAndDom:', error);
		return null;
	}
}

function notifyExtension(): void {
	const content = getSelectionAndDom();
	if (!content) {
		return;
	}

	const message: ClipMessage = {
		type: 'clip',
		dom: content.dom,
		selection: content.selection,
		pageUrl: content.pageUrl,
	};
	browser.runtime.sendMessage(message).catch((error: unknown) => {
		console.debug('Failed to notify extension:', error);
	});
}

function copyToClipboard(text: string): void {
	if (navigator.clipboard?.writeText) {
		void navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.style.position = 'fixed';
	textarea.style.left = '-999999px';
	getDocumentRoot().appendChild(textarea);
	textarea.select();
	document.execCommand('copy');
	textarea.remove();
}

function downloadMarkdown(filename: string, text: string): void {
	const datauri = `data:text/markdown;base64,${text}`;
	const link = document.createElement('a');
	link.download = filename;
	link.href = datauri;
	link.click();
}

function downloadImage(_filename: string, _url: string): void {}

export function initCaptureContentScript(): void {
	getCaptureState();
	void loadPageContextScript();
	window.snipsnipPrepareForCapture = snipsnipPrepareForCapture;
	window.getSelectionAndDom = getSelectionAndDom;

	void notifyExtension;
	void copyToClipboard;
	void downloadMarkdown;
	void downloadImage;
}
