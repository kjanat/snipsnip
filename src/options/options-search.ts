/**
 * SnipSnip — Options Search (adapter over shared search-core)
 *
 * Builds a search index from the options DOM and delegates scoring
 * to the shared fuzzy engine in search-core.js.
 *
 * Public API (attached to root.snipSnipOptionsSearch):
 *   buildSearchIndex(rootNode)    → index[]
 *   normalizeSearchText(value)    → string
 *   searchSettings(index, query)  → { query, tokens, stage, results, matches }
 */

/**
 * @typedef {Object} SearchField
 * @property {string}  normalized  - Normalized text content of the field
 * @property {string}  source      - Where the field was extracted from (e.g. 'card-title')
 * @property {boolean} primary     - Whether this field is a primary qualifier
 * @property {boolean} qualifies   - Whether a match here is enough to surface the entry
 * @property {boolean} [isAlias]   - Whether the field comes from a data-search-keywords alias
 * @property {boolean} [allowFuzzy] - Whether fuzzy matching is permitted for this field
 */

/**
 * @typedef {Object} SearchEntry
 * @property {Element}       card    - The `.setting-card` DOM element
 * @property {Element}       section - The parent `.section` DOM element
 * @property {SearchField[]} fields  - All indexed fields for this card
 */

/**
 * @typedef {Object} TokenMatch
 * @property {string}   token   - The individual query token
 * @property {string}   field   - The normalized field text that matched
 * @property {number}   score   - Match score for this token/field pair
 */

/**
 * @typedef {Object} SearchResult
 * @property {Element}       card         - The `.setting-card` DOM element
 * @property {Element}       section      - The parent `.section` DOM element
 * @property {SearchField[]} fields       - Indexed fields
 * @property {boolean}       matches      - Whether this entry matched the query
 * @property {number}        score        - Aggregate relevance score
 * @property {TokenMatch[]}  tokenMatches - Per-token match details
 */

/**
 * @typedef {'none'|'strict'|'fallback'} SearchStage
 */

/**
 * @typedef {Object} SearchResponse
 * @property {string}         query   - Normalized query string that was searched
 * @property {string[]}       tokens  - Individual tokens derived from the query
 * @property {SearchStage}    stage   - Which scoring pass produced these results
 * @property {SearchResult[]} results - All entries, scored and sorted
 * @property {SearchResult[]} matches - Subset of results that matched
 */

/**
 * @typedef {Object} CreateFieldOptions
 * @property {string}   source      - Field source identifier
 * @property {boolean}  primary     - Whether the field is primary
 * @property {boolean}  qualifies   - Whether a match qualifies the entry
 * @property {boolean}  [isAlias]   - Whether the field is an alias
 * @property {boolean}  [allowFuzzy] - Whether fuzzy matching is allowed
 * @property {function(Element): string} [clean] - Optional text extractor override
 */

/**
 * @typedef {Object} OptionsSearchAPI
 * @property {typeof buildSearchIndex}    buildSearchIndex
 * @property {typeof normalizeSearchText} normalizeSearchText
 * @property {typeof searchSettings}      searchSettings
 */

/** @type {OptionsSearchAPI} */
const api = ((root) => {
	const core = root.snipSnipSearchCore;
	/* Re-export helpers the options page already depends on */
	const normalizeSearchText = core.normalizeSearchText;

	/* ── DOM helpers ── */

	/**
	 * Returns the text content of an element after removing matched descendants.
	 * @param {Element|null|undefined} element
	 * @param {string[]} [selectorsToRemove]
	 * @returns {string}
	 */
	function getCleanText(element, selectorsToRemove) {
		if (!element) return '';
		const clone = element.cloneNode(true);
		(selectorsToRemove || []).forEach(sel => {
			clone.querySelectorAll(sel).forEach(n => n.remove());
		});
		return clone.textContent || '';
	}

	/**
	 * Creates a SearchField via core and appends it to the entry if not duplicate.
	 * @param {SearchEntry & { fieldKeys: Set<string> }} entry
	 * @param {string|null|undefined} rawText
	 * @param {CreateFieldOptions} options
	 * @returns {void}
	 */
	function addField(entry, rawText, options) {
		const field = core.createField(rawText, options);
		if (!field) return;
		const key = [
			field.primary ? 'primary' : 'secondary',
			field.qualifies ? 'qualifies' : 'boost',
			field.isAlias ? 'alias' : 'field',
			field.normalized,
		].join('|');
		if (entry.fieldKeys.has(key)) return;
		entry.fieldKeys.add(key);
		entry.fields.push(field);
	}

	/**
	 * Returns true if the node or any ancestor has `data-search-exclude`.
	 * @param {Node|null|undefined} node
	 * @returns {boolean}
	 */
	function isSearchExcluded(node) {
		return !!node?.closest?.('[data-search-exclude]');
	}

	/**
	 * Iterates a NodeList, skipping excluded nodes, and adds a field for each.
	 * @param {SearchEntry & { fieldKeys: Set<string> }} entry
	 * @param {NodeListOf<Element>} nodes
	 * @param {CreateFieldOptions} options
	 * @returns {void}
	 */
	function addFieldsFromNodeList(entry, nodes, options) {
		nodes.forEach(node => {
			if (isSearchExcluded(node)) return;
			addField(entry, options.clean ? options.clean(node) : node.textContent, options);
		});
	}

	/**
	 * Adds primary fields sourced from form control `name` and `id` attributes.
	 * @param {SearchEntry & { fieldKeys: Set<string> }} entry
	 * @param {Element} card
	 * @returns {void}
	 */
	function addControlFields(entry, card) {
		card.querySelectorAll('input, textarea, select').forEach(control => {
			if (isSearchExcluded(control)) return;
			addField(entry, control.name, { source: 'control-name', primary: true, qualifies: true, allowFuzzy: true });
			addField(entry, control.id, { source: 'control-id', primary: true, qualifies: true, allowFuzzy: true });
		});
	}

	/**
	 * Parses `data-search-keywords` on the card and adds each as an alias field.
	 * @param {SearchEntry & { fieldKeys: Set<string> }} entry
	 * @param {HTMLElement} card
	 * @returns {void}
	 */
	function addAliasFields(entry, card) {
		const raw = card.dataset.searchKeywords;
		if (!raw) return;
		raw.split(',').forEach(kw => {
			addField(entry, kw, { source: 'alias', primary: true, qualifies: true, isAlias: true, allowFuzzy: true });
		});
	}

	/**
	 * Builds a single index entry from a setting card and its parent section.
	 * @param {HTMLElement} card
	 * @param {Element} section
	 * @param {string} sectionTitle
	 * @returns {SearchEntry}
	 */
	function createEntry(card, section, sectionTitle) {
		/** @type {SearchEntry & { fieldKeys: Set<string> }} */
		const entry = { card, section, fields: [], fieldKeys: new Set() };

		addField(entry, sectionTitle, { source: 'section-title', primary: true, qualifies: false, allowFuzzy: true });
		addField(entry, card.querySelector('.card-title')?.textContent, {
			source: 'card-title',
			primary: true,
			qualifies: true,
		});

		addFieldsFromNodeList(entry, card.querySelectorAll('.toggle-label-text'), {
			source: 'toggle-label',
			primary: true,
			qualifies: true,
		});
		addFieldsFromNodeList(entry, card.querySelectorAll('.input-label'), {
			source: 'input-label',
			primary: true,
			qualifies: true,
		});
		addFieldsFromNodeList(entry, card.querySelectorAll('.radio-card-title'), {
			source: 'radio-card-title',
			primary: true,
			qualifies: true,
		});
		addFieldsFromNodeList(entry, card.querySelectorAll('.radio-pill label'), {
			source: 'radio-pill-label',
			primary: true,
			qualifies: true,
			clean: label => getCleanText(label, ['.radio-pill-tooltip']),
		});

		addControlFields(entry, card);
		addAliasFields(entry, card);

		addFieldsFromNodeList(entry, card.querySelectorAll('.card-desc'), {
			source: 'card-desc',
			primary: false,
			qualifies: false,
			allowFuzzy: false,
			clean: n => getCleanText(n, ['a']),
		});
		addFieldsFromNodeList(entry, card.querySelectorAll('.toggle-hint'), {
			source: 'toggle-hint',
			primary: false,
			qualifies: false,
			allowFuzzy: false,
		});
		addFieldsFromNodeList(entry, card.querySelectorAll('.option-note'), {
			source: 'option-note',
			primary: false,
			qualifies: false,
			allowFuzzy: false,
		});

		delete entry.fieldKeys;
		return entry;
	}

	/**
	 * Walks the DOM under `rootNode` and builds a flat array of search entries,
	 * one per `.setting-card`.
	 * @param {Element|Document|null|undefined} rootNode
	 * @returns {SearchEntry[]}
	 */
	function buildSearchIndex(rootNode) {
		const rootEl = rootNode?.querySelectorAll ? rootNode : document;
		/** @type {SearchEntry[]} */
		const index = [];
		rootEl.querySelectorAll('.section').forEach(section => {
			const sectionTitle = section.querySelector('.section-title')?.textContent || section.dataset.sectionLabel || '';
			section.querySelectorAll('.setting-card').forEach(card => {
				index.push(createEntry(card, section, sectionTitle));
			});
		});
		return index;
	}

	/**
	 * Runs a fuzzy search over the index, falling back to relaxed thresholds
	 * when the strict pass returns no matches.
	 * @param {SearchEntry[]} index
	 * @param {string} query
	 * @returns {SearchResponse}
	 */
	function searchSettings(index, query) {
		const nq = normalizeSearchText(query);
		if (!nq) {
			return {
				query: '',
				tokens: [],
				stage: 'none',
				results: index.map(e => ({ ...e, matches: false, score: 0, tokenMatches: [] })),
				matches: [],
			};
		}
		const strict = core.runSearch(index, nq, core.STRICT_THRESHOLDS, 'strict');
		return strict.matches.length > 0
			? strict
			: core.runSearch(index, nq, core.FALLBACK_THRESHOLDS, 'fallback');
	}

	return { buildSearchIndex, normalizeSearchText, searchSettings };
})(typeof globalThis !== 'undefined' ? globalThis : this);

globalThis.snipSnipOptionsSearch = api;

export default api;
