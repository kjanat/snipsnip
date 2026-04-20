import { createLinkPickerState, getLinkPickerState } from '@/contentScript/state.ts';
import type {
	AccentColors,
	AccentKey,
	LinkPickerActivationMessage,
	LinkPickerCompleteMessage,
	MessageWithType,
} from '@/contentScript/types.ts';
import { storage } from '@/shared/storage.ts';

const ACCENT_COLORS: Record<AccentKey, AccentColors> = {
	sage: { dark: '#56735A', darker: '#3F5441', base: '#6B8E6F' },
	ocean: { dark: '#4A7A92', darker: '#385D6F', base: '#5B8FA8' },
	slate: { dark: '#56657A', darker: '#414D5C', base: '#6B7B8E' },
	rose: { dark: '#965C5C', darker: '#7A4A4A', base: '#B07070' },
	amber: { dark: '#967840', darker: '#7A6030', base: '#B08E50' },
};

function getDocumentRoot(): HTMLElement {
	return document.body ?? document.documentElement;
}

function isMessageWithType(message: unknown): message is MessageWithType {
	return typeof message === 'object' && message !== null && 'type' in message;
}

function isLinkPickerActivationMessage(message: unknown): message is LinkPickerActivationMessage {
	return isMessageWithType(message) && message.type === 'ACTIVATE_LINK_PICKER';
}

function isAccentKey(value: string): value is AccentKey {
	return value in ACCENT_COLORS;
}

async function initLinkPickerMode(): Promise<void> {
	const linkPickerState = getLinkPickerState();
	if (linkPickerState.active) {
		console.log('Link picker already active');
		return;
	}

	linkPickerState.active = true;
	linkPickerState.selectedLinks = new Set<string>();
	linkPickerState.selectedElements = new Set<Element>();
	linkPickerState.lastSelectedElement = null;

	let accentColors = ACCENT_COLORS.sage;
	try {
		const accent = (await storage.getItem<string>('sync:popupAccent')) ?? 'sage';
		if (isAccentKey(accent)) {
			accentColors = ACCENT_COLORS[accent];
		}
	} catch (_error) {
		// Default accent already set.
	}

	linkPickerState.accentColors = accentColors;
	injectLinkPickerStyles(accentColors);
	createControlPanel();
	setupLinkPickerEventListeners();

	console.log('Link picker mode activated');
}

function injectLinkPickerStyles(colors: AccentColors): void {
	const linkPickerState = getLinkPickerState();
	const base = colors.base;
	const dark = colors.dark;
	const darker = colors.darker;
	const hexToRgb = (hex: string): string => {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return `${r}, ${g}, ${b}`;
	};
	const baseRgb = hexToRgb(base);
	const darkRgb = hexToRgb(dark);

	const styles = `
        .snipsnip-link-picker-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.25);
            z-index: 999998;
            pointer-events: none;
        }

        .snipsnip-link-picker-highlight {
            outline: 2px solid ${base} !important;
            outline-offset: 3px !important;
            cursor: pointer !important;
            position: relative !important;
            box-shadow: 0 0 0 5px rgba(${baseRgb}, 0.18) !important;
            transition: outline 100ms ease, box-shadow 100ms ease !important;
        }

        .snipsnip-link-picker-selected {
            outline: 2px solid ${dark} !important;
            outline-offset: 3px !important;
            box-shadow: 0 0 0 5px rgba(${darkRgb}, 0.18) !important;
        }

        .snipsnip-link-picker-selected::after {
            content: '✓';
            position: absolute;
            top: -10px;
            right: -10px;
            width: 20px;
            height: 20px;
            background: ${dark};
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 13px;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
            z-index: 999999;
        }

        .snipsnip-link-picker-tooltip {
            position: fixed;
            background: #292524;
            color: #FAFAF9;
            padding: 6px 11px;
            border-radius: 6px;
            font-size: 12px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            pointer-events: none;
            z-index: 1000000;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
            letter-spacing: 0.01em;
        }

        .snipsnip-link-picker-panel {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: linear-gradient(150deg, ${darker} 0%, ${dark} 100%);
            border-radius: 12px;
            padding: 18px 20px 16px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 1000001;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-width: 240px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transform: translateZ(0);
            will-change: transform, opacity;
            animation: snipsnip-slideUp 240ms ease-out both;
        }

        .snipsnip-link-picker-panel-title {
            font-size: 12px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 3px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .snipsnip-link-picker-panel-info {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.55);
            margin-bottom: 14px;
            text-align: center;
        }

        .snipsnip-link-picker-panel-count {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
            margin-bottom: 14px;
            display: block;
            transform-origin: center;
            text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }

        .snipsnip-link-picker-panel-count.snipsnip-bump {
            animation: snipsnip-countBump 220ms ease-out both;
        }

        .snipsnip-link-picker-panel-buttons {
            display: flex;
            gap: 8px;
        }

        .snipsnip-link-picker-btn {
            flex: 1;
            padding: 9px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            transition: background 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
        }

        .snipsnip-link-picker-btn-done {
            background: rgba(255, 255, 255, 0.95);
            color: ${darker};
            border: 1px solid rgba(255, 255, 255, 0.4);
        }

        .snipsnip-link-picker-btn-done:hover {
            background: ${base};
            color: white;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
        }

        .snipsnip-link-picker-btn-done:active {
            background: ${dark};
            color: white;
            box-shadow: none;
        }

        .snipsnip-link-picker-btn-done.snipsnip-pulse {
            animation: snipsnip-donePulse 380ms ease-out both;
        }

        .snipsnip-link-picker-btn-cancel {
            background: rgba(255, 255, 255, 0.12);
            color: rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .snipsnip-link-picker-btn-cancel:hover {
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
        }

        .snipsnip-link-picker-instructions {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.4);
            text-align: center;
            margin-top: 12px;
            line-height: 1.6;
        }

        .snipsnip-click-ripple {
            position: fixed;
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000002;
            transform: scale(0);
            animation: snipsnip-rippleOut 480ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        @keyframes snipsnip-slideUp {
            from { opacity: 0; transform: translateZ(0) translateY(16px); }
            to   { opacity: 1; transform: translateZ(0) translateY(0); }
        }

        @keyframes snipsnip-rippleOut {
            0%   { transform: scale(0);   opacity: 0.7; }
            100% { transform: scale(1);   opacity: 0; }
        }

        @keyframes snipsnip-donePulse {
            0%   { transform: scale(1); }
            40%  { transform: scale(1.1); }
            70%  { transform: scale(0.97); }
            100% { transform: scale(1); }
        }

        @keyframes snipsnip-countBump {
            0%   { transform: scale(1); }
            50%  { transform: scale(1.25); }
            100% { transform: scale(1); }
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
            to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        @keyframes fadeOut {
            from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            to   { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
        }
    `;

	linkPickerState.styleElement = document.createElement('style');
	linkPickerState.styleElement.textContent = styles;
	(document.head ?? document.documentElement).appendChild(linkPickerState.styleElement);

	const overlay = document.createElement('div');
	overlay.className = 'snipsnip-link-picker-overlay';
	overlay.id = 'snipsnip-link-picker-overlay';
	getDocumentRoot().appendChild(overlay);
}

function createControlPanel(): void {
	const linkPickerState = getLinkPickerState();
	const panel = document.createElement('div');
	panel.className = 'snipsnip-link-picker-panel';
	panel.id = 'snipsnip-link-picker-panel';
	panel.innerHTML = `
        <div class="snipsnip-link-picker-panel-title">Link Picker</div>
        <div class="snipsnip-link-picker-panel-info">Hover over elements to find links</div>
        <div class="snipsnip-link-picker-panel-count" id="snipsnip-link-count">0 links</div>
        <div class="snipsnip-link-picker-panel-buttons">
            <button class="snipsnip-link-picker-btn snipsnip-link-picker-btn-cancel" id="snipsnip-link-picker-cancel">
                Cancel
            </button>
            <button class="snipsnip-link-picker-btn snipsnip-link-picker-btn-done" id="snipsnip-link-picker-done">
                Done
            </button>
        </div>
        <div class="snipsnip-link-picker-panel-buttons" style="margin-top: 8px;">
            <button class="snipsnip-link-picker-btn snipsnip-link-picker-btn-cancel" id="snipsnip-link-picker-undo" title="Undo last selection">
                Undo
            </button>
            <button class="snipsnip-link-picker-btn snipsnip-link-picker-btn-cancel" id="snipsnip-link-picker-clear" title="Deselect all elements">
                Clear All
            </button>
        </div>
        <div class="snipsnip-link-picker-instructions">
            Click elements to select links<br>
            Press ESC to cancel
        </div>
    `;
	getDocumentRoot().appendChild(panel);
	linkPickerState.controlPanel = panel;

	panel.querySelector<HTMLButtonElement>('#snipsnip-link-picker-done')?.addEventListener('click', finishLinkPicker);
	panel.querySelector<HTMLButtonElement>('#snipsnip-link-picker-cancel')?.addEventListener('click', cancelLinkPicker);
	panel.querySelector<HTMLButtonElement>('#snipsnip-link-picker-undo')?.addEventListener('click', undoLastSelection);
	panel.querySelector<HTMLButtonElement>('#snipsnip-link-picker-clear')?.addEventListener('click', clearAllSelections);
}

function setupLinkPickerEventListeners(): void {
	const linkPickerState = getLinkPickerState();
	linkPickerState.handlers.mousemove = (event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest('#snipsnip-link-picker-panel')) {
			removeHighlight();
			return;
		}

		if (target.id === 'snipsnip-link-picker-overlay' || linkPickerState.selectedElements.has(target)) {
			return;
		}

		highlightElement(target, event.clientX, event.clientY);
	};

	linkPickerState.handlers.click = (event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof Element)) {
			return;
		}

		if (target.closest('#snipsnip-link-picker-panel')) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (linkPickerState.selectedElements.has(target)) {
			deselectElement(target, event.clientX, event.clientY);
		} else {
			selectElement(target, event.clientX, event.clientY);
		}
	};

	linkPickerState.handlers.keydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') {
			event.preventDefault();
			cancelLinkPicker();
		}
	};

	if (linkPickerState.handlers.mousemove) {
		document.addEventListener('mousemove', linkPickerState.handlers.mousemove, true);
	}
	if (linkPickerState.handlers.click) {
		document.addEventListener('click', linkPickerState.handlers.click, true);
	}
	if (linkPickerState.handlers.keydown) {
		document.addEventListener('keydown', linkPickerState.handlers.keydown, true);
	}
}

function highlightElement(element: Element, mouseX: number, mouseY: number): void {
	const linkPickerState = getLinkPickerState();
	removeHighlight();
	if (linkPickerState.selectedElements.has(element)) {
		return;
	}

	element.classList.add('snipsnip-link-picker-highlight');
	linkPickerState.hoveredElement = element;

	const linkCount = extractLinksFromElement(element).length;
	showTooltip(
		linkCount > 0 ? `${linkCount} link${linkCount !== 1 ? 's' : ''} found` : 'No links in this element',
		mouseX,
		mouseY,
	);
}

function removeHighlight(): void {
	const linkPickerState = getLinkPickerState();
	if (linkPickerState.hoveredElement) {
		linkPickerState.hoveredElement.classList.remove('snipsnip-link-picker-highlight');
		linkPickerState.hoveredElement = null;
	}
	removeTooltip();
}

function showTooltip(text: string, x: number, y: number): void {
	removeTooltip();
	const tooltip = document.createElement('div');
	tooltip.className = 'snipsnip-link-picker-tooltip';
	tooltip.id = 'snipsnip-link-picker-tooltip';
	tooltip.textContent = text;
	tooltip.style.left = `${x + 10}px`;
	tooltip.style.top = `${y + 10}px`;
	getDocumentRoot().appendChild(tooltip);
}

function removeTooltip(): void {
	document.getElementById('snipsnip-link-picker-tooltip')?.remove();
}

function spawnClickRipple(x: number, y: number, color: string): void {
	const size = 56;
	const ripple = document.createElement('div');
	ripple.className = 'snipsnip-click-ripple';
	ripple.style.cssText = [
		`width: ${size}px`,
		`height: ${size}px`,
		`left: ${x - size / 2}px`,
		`top: ${y - size / 2}px`,
		`background: ${color}`,
	].join(';');
	getDocumentRoot().appendChild(ripple);
	ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

function selectElement(element: Element, clientX = 0, clientY = 0): void {
	const linkPickerState = getLinkPickerState();
	const links = extractLinksFromElement(element);
	if (links.length === 0) {
		spawnClickRipple(clientX, clientY, 'rgba(168, 162, 158, 0.45)');
		return;
	}

	links.forEach((link) => {
		linkPickerState.selectedLinks.add(link);
	});
	linkPickerState.selectedElements.add(element);
	linkPickerState.lastSelectedElement = element;
	element.classList.remove('snipsnip-link-picker-highlight');
	element.classList.add('snipsnip-link-picker-selected');

	const ac = linkPickerState.accentColors ?? ACCENT_COLORS.sage;
	const hexToRgbInline = (hex: string): string =>
		`${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
	spawnClickRipple(clientX, clientY, `rgba(${hexToRgbInline(ac.base)}, 0.4)`);

	updateLinkCount();
}

function deselectElement(element: Element, clientX = 0, clientY = 0): void {
	const linkPickerState = getLinkPickerState();
	const links = extractLinksFromElement(element);
	links.forEach((link) => {
		linkPickerState.selectedLinks.delete(link);
	});
	linkPickerState.selectedElements.delete(element);
	element.classList.remove('snipsnip-link-picker-selected');
	spawnClickRipple(clientX, clientY, 'rgba(168, 162, 158, 0.45)');
	updateLinkCount();
}

function undoLastSelection(): void {
	const linkPickerState = getLinkPickerState();
	const last = linkPickerState.lastSelectedElement;
	if (last && linkPickerState.selectedElements.has(last)) {
		deselectElement(last);
		linkPickerState.lastSelectedElement = null;
	}
}

function clearAllSelections(): void {
	const linkPickerState = getLinkPickerState();
	for (const element of Array.from(linkPickerState.selectedElements)) {
		deselectElement(element);
	}
	linkPickerState.lastSelectedElement = null;
}

function extractLinksFromElement(element: Element): string[] {
	const links = new Set<string>();
	const anchors = Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href]'));
	if (element instanceof HTMLAnchorElement && element.href) {
		anchors.push(element);
	}

	anchors.forEach((anchor) => {
		try {
			const href = anchor.getAttribute('href');
			if (!href) {
				return;
			}

			const absolute = new URL(href, window.location.href);
			if (absolute.protocol === 'http:' || absolute.protocol === 'https:') {
				links.add(absolute.href);
			}
		} catch (error) {
			console.debug('Invalid URL:', error);
		}
	});

	return Array.from(links);
}

function updateLinkCount(): void {
	const count = getLinkPickerState().selectedLinks.size;
	const countElement = document.getElementById('snipsnip-link-count');
	const doneBtn = document.getElementById('snipsnip-link-picker-done');

	if (countElement) {
		countElement.textContent = `${count} link${count !== 1 ? 's' : ''}`;
		countElement.classList.remove('snipsnip-bump');
		void countElement.offsetWidth;
		countElement.classList.add('snipsnip-bump');
	}

	if (doneBtn) {
		if (count === 1) {
			doneBtn.classList.remove('snipsnip-pulse');
			void doneBtn.offsetWidth;
			doneBtn.classList.add('snipsnip-pulse');
		} else if (count === 0) {
			doneBtn.classList.remove('snipsnip-pulse');
		}
	}
}

function finishLinkPicker(): void {
	const links = Array.from(getLinkPickerState().selectedLinks);
	if (links.length === 0) {
		alert('No links selected. Please select elements containing links before clicking Done.');
		return;
	}

	void storage.setItems([
		{ key: 'local:linkPickerResults', value: links },
		{ key: 'local:linkPickerTimestamp', value: Date.now() },
	]).then(() => {
		console.log(`Saved ${links.length} links to storage`);
		showSuccessNotification(links.length);

		const message: LinkPickerCompleteMessage = {
			type: 'LINK_PICKER_COMPLETE',
			links,
		};
		browser.runtime.sendMessage(message).catch((_error: unknown) => {
			console.log('Popup closed, links saved to storage');
		});

		setTimeout(() => {
			cleanupLinkPicker();
		}, 2000);
	});
}

function showSuccessNotification(linkCount: number): void {
	const ac = getLinkPickerState().accentColors ?? ACCENT_COLORS.sage;
	const notification = document.createElement('div');
	notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(150deg, ${ac.darker} 0%, ${ac.dark} 100%);
        padding: 32px 48px;
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
        z-index: 10000000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.12);
        animation: fadeIn 0.3s ease-out;
    `;
	notification.innerHTML = `
        <div style="font-size: 44px; margin-bottom: 14px; line-height: 1;">✓</div>
        <div style="font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 8px;">
            ${linkCount} link${linkCount !== 1 ? 's' : ''} collected!
        </div>
        <div style="font-size: 13px; color: rgba(255, 255, 255, 0.6);">
            Reopen the extension to add them to the batch processor
        </div>
    `;
	getDocumentRoot().appendChild(notification);

	setTimeout(() => {
		notification.style.animation = 'fadeOut 0.3s ease-out';
		setTimeout(() => notification.remove(), 300);
	}, 1700);
}

function cancelLinkPicker(): void {
	void storage.removeItems(['local:linkPickerResults', 'local:linkPickerTimestamp']).then(() => {
		const message: LinkPickerCompleteMessage = {
			type: 'LINK_PICKER_COMPLETE',
			links: [],
		};
		browser.runtime.sendMessage(message).catch((_error: unknown) => {
			console.log('Popup closed');
		});

		cleanupLinkPicker();
	});
}

function cleanupLinkPicker(): void {
	const linkPickerState = getLinkPickerState();
	if (linkPickerState.handlers.mousemove) {
		document.removeEventListener('mousemove', linkPickerState.handlers.mousemove, true);
	}
	if (linkPickerState.handlers.click) {
		document.removeEventListener('click', linkPickerState.handlers.click, true);
	}
	if (linkPickerState.handlers.keydown) {
		document.removeEventListener('keydown', linkPickerState.handlers.keydown, true);
	}

	linkPickerState.selectedElements.forEach((element) => {
		element.classList.remove('snipsnip-link-picker-selected');
	});
	removeHighlight();
	linkPickerState.controlPanel?.remove();
	document.getElementById('snipsnip-link-picker-overlay')?.remove();
	linkPickerState.styleElement?.remove();
	window.linkPickerState = createLinkPickerState();

	console.log('Link picker mode deactivated');
}

export function initLinkPickerContentScript(): void {
	getLinkPickerState();
	if (window.linkPickerMessageListenerAdded) {
		return;
	}

	browser.runtime.onMessage.addListener((message: unknown) => {
		if (isLinkPickerActivationMessage(message)) {
			initLinkPickerMode();
			return Promise.resolve({ success: true });
		}
	});
	window.linkPickerMessageListenerAdded = true;
}
