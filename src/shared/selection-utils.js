((root, factory) => {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory(root);
		return;
	}

	root.snipSnipSelectionUtils = factory(root);
})(typeof globalThis !== 'undefined' ? globalThis : this, (root) => {
	function buildDomWithSelection(domString, selectionHtml, shouldUseSelection = true) {
		if (!shouldUseSelection || typeof selectionHtml !== 'string' || !selectionHtml.trim()) {
			return domString;
		}

		const DomParser = root.DOMParser;
		if (typeof DomParser !== 'function') {
			return domString;
		}

		try {
			const parser = new DomParser();
			const dom = parser.parseFromString(domString, 'text/html');
			if (dom.documentElement.nodeName === 'parsererror') {
				return domString;
			}

			if (dom.body) {
				dom.body.innerHTML = selectionHtml;
				return dom.documentElement.outerHTML;
			}
		} catch (_error) {
			return domString;
		}

		return domString;
	}

	return {
		buildDomWithSelection,
	};
});
