interface MathItem {
	typesetRoot?: { setAttribute: (name: string, value: string) => void };
	math?: unknown;
}

interface MathCollection extends Iterable<MathItem> {
	list?: readonly MathItem[];
}

interface MathJaxStartup {
	document?: { math?: MathCollection | readonly MathItem[] };
	promise?: Promise<unknown>;
}

interface MathJax {
	startup?: MathJaxStartup;
}

interface SnipsnipPageWindow extends Window {
	MathJax?: MathJax;
	__snipsnipMathJaxRequestListenerInstalled?: boolean;
}

interface SyncDetail {
	reason: string;
	mathJaxAvailable: boolean;
	totalMathItems: number;
	taggedCount: number;
	timestamp: number;
	error?: string;
}

const LATEX_ATTR = 'snipsnip-latex';
const SYNC_EVENT_NAME = 'snipsnip:mathjax-sync';
const SYNC_REQUEST_EVENT_NAME = 'snipsnip:mathjax-sync-request';

function getMathItems(pageWindow: SnipsnipPageWindow): readonly MathItem[] {
	const mathCollection = pageWindow.MathJax?.startup?.document?.math;
	if (mathCollection == null) {
		return [];
	}

	if (Array.isArray(mathCollection)) {
		return mathCollection;
	}

	if (typeof (mathCollection as Iterable<MathItem>)[Symbol.iterator] === 'function') {
		try {
			return Array.from(mathCollection as Iterable<MathItem>);
		} catch {
			// Fall through to list fallback.
		}
	}

	const list = (mathCollection as MathCollection).list;
	if (Array.isArray(list)) {
		return list;
	}

	return [];
}

function dispatchSyncEvent(pageWindow: SnipsnipPageWindow, detail: SyncDetail): void {
	try {
		pageWindow.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail }));
	} catch {
		// Ignore cross-context event failures.
	}
}

function syncMathJaxLatex(pageWindow: SnipsnipPageWindow, reason: string): SyncDetail {
	const detail: SyncDetail = {
		reason,
		mathJaxAvailable: typeof pageWindow.MathJax !== 'undefined',
		totalMathItems: 0,
		taggedCount: 0,
		timestamp: Date.now(),
	};

	try {
		const mathItems = getMathItems(pageWindow);
		detail.totalMathItems = mathItems.length;

		for (const math of mathItems) {
			if (math.typesetRoot == null || typeof math.math !== 'string') {
				continue;
			}
			math.typesetRoot.setAttribute(LATEX_ATTR, math.math);
			detail.taggedCount += 1;
		}
	} catch (error) {
		detail.error = String(error);
	}

	dispatchSyncEvent(pageWindow, detail);
	return detail;
}

export default defineUnlistedScript(() => {
	const pageWindow = window as SnipsnipPageWindow;

	if (pageWindow.__snipsnipMathJaxRequestListenerInstalled !== true) {
		pageWindow.__snipsnipMathJaxRequestListenerInstalled = true;
		pageWindow.addEventListener(SYNC_REQUEST_EVENT_NAME, () => {
			syncMathJaxLatex(pageWindow, 'request');
		});
	}

	syncMathJaxLatex(pageWindow, 'init');

	const startupPromise = pageWindow.MathJax?.startup?.promise;
	if (startupPromise != null && typeof startupPromise.then === 'function') {
		startupPromise
			.then(() => syncMathJaxLatex(pageWindow, 'startup-promise'))
			.catch(() => syncMathJaxLatex(pageWindow, 'startup-promise-error'));
	}
});
