const vm = require('node:vm');
const { Window } = require('happy-dom');

class JSDOM {
	constructor(html = '<!DOCTYPE html><html><head></head><body></body></html>', options = {}) {
		this.window = new Window({
			url: options.url,
		});

		const runtimeGlobals = {
			Object,
			Array,
			String,
			Number,
			Boolean,
			RegExp,
			Date,
			Math,
			JSON,
			Set,
			Map,
			WeakSet,
			WeakMap,
			Promise,
			Symbol,
			URL,
			URLSearchParams,
			Error,
			TypeError,
			SyntaxError,
			RangeError,
			ReferenceError,
			TextEncoder,
			TextDecoder,
			Intl,
			console,
			setTimeout,
			clearTimeout,
			setInterval,
			clearInterval,
			queueMicrotask,
			parseInt,
			parseFloat,
			encodeURIComponent,
			decodeURIComponent,
		};

		for (const [key, value] of Object.entries(runtimeGlobals)) {
			this.window[key] = value;
		}

		for (const key of Object.getOwnPropertyNames(globalThis)) {
			if (!(key in this.window)) {
				Object.defineProperty(this.window, key, Object.getOwnPropertyDescriptor(globalThis, key));
			}
		}

		this.window.globalThis = this.window;
		this.window.window = this.window;
		this.window.self = this.window;
		this.window.SyntaxError = SyntaxError;
		this.window.TypeError = TypeError;
		this.context = vm.createContext(this.window);
		this.window.eval = (code) => vm.runInContext(String(code), this.context);

		const normalizedHtml = String(html).replace(/<!DOCTYPE[^>]*>/i, '');
		this.window.document.documentElement.innerHTML = normalizedHtml;
	}

	serialize() {
		return '<!DOCTYPE html>' + this.window.document.documentElement.outerHTML;
	}
}

module.exports = {
	JSDOM,
};
