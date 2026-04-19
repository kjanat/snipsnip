/**
 * Browser Environment Setup for Tests
 * Loads browser libraries (Turndown, Readability) in a JSDOM environment
 */

import turndownFactory from '@/shared/turndown-factory.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from './jsdom-shim';

/**
 * Create a browser-like environment with required libraries loaded
 */
function createBrowserEnvironment() {
	// Create JSDOM instance
	const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
		url: 'https://example.com',
		contentType: 'text/html',
		runScripts: 'dangerously',
		resources: 'usable',
	});

	const { window } = dom;
	const { document } = window;

	// Load Turndown library
	const turndownPath = join(import.meta.dirname, '../../background/turndown.js');
	const turndownCode = readFileSync(turndownPath, 'utf8');

	// Load Turndown GFM plugin
	const gfmPath = join(import.meta.dirname, '../../background/turndown-plugin-gfm.js');
	const gfmCode = readFileSync(gfmPath, 'utf8');

	// Load Readability library
	const readabilityPath = join(import.meta.dirname, '../../background/Readability.js');
	const readabilityCode = readFileSync(readabilityPath, 'utf8');

	// Load shared readability recovery helpers
	const readabilityRecoveryPath = join(import.meta.dirname, '../../shared/readability-recovery.js');
	const readabilityRecoveryCode = readFileSync(readabilityRecoveryPath, 'utf8');

	// Execute library sources directly inside the test window.
	dom.window.eval(`
		${turndownCode}
		${gfmCode}
		${readabilityCode}
		${readabilityRecoveryCode}
	`);

	return {
		window,
		document,
		TurndownService: dom.window.TurndownService,
		turndownPluginGfm: dom.window.turndownPluginGfm,
		Readability: dom.window.Readability,
		ReadabilityRecovery: dom.window.SnipSnipReadabilityRecovery,
	};
}

/**
 * Create a configured TurndownService instance
 */
function createTurndownService(options = {}) {
	const env = createBrowserEnvironment();
	const { service } = turndownFactory.createTurndownService(options, env);

	return { service, env };
}

/**
 * Parse HTML using Readability
 */
function normalizeMeaningfulText(text) {
	return String(text || '').replace(/\s+/g, ' ').trim();
}

function parseArticleHtmlFragment(window, articleHtml) {
	const parser = new window.DOMParser();
	return parser.parseFromString(`<!DOCTYPE html><html><body>${articleHtml || ''}</body></html>`, 'text/html');
}

function meaningfulTextLengthFromArticleHtml(window, articleHtml) {
	const documentFragment = parseArticleHtmlFragment(window, articleHtml);
	return normalizeMeaningfulText(documentFragment.body.textContent).length;
}

function linkDensityFromArticleHtml(window, articleHtml) {
	const documentFragment = parseArticleHtmlFragment(window, articleHtml);
	const textLength = meaningfulTextLengthFromArticleHtml(window, articleHtml);
	if (!textLength) {
		return 0;
	}

	let linkTextLength = 0;
	documentFragment.body.querySelectorAll('a').forEach(anchor => {
		linkTextLength += normalizeMeaningfulText(anchor.textContent).length;
	});
	return linkTextLength / textLength;
}

function articleHtmlContainsAnyWitness(window, articleHtml, witnessIds, anchorAttribute) {
	if (!witnessIds?.length) {
		return false;
	}

	const documentFragment = parseArticleHtmlFragment(window, articleHtml);
	return witnessIds.some(witnessId => (
		!!documentFragment.body.querySelector(`[${anchorAttribute}="${witnessId}"]`)
	));
}

function buildRecoveredArticle(window, firstPassArticle, recoveredHtml) {
	const documentFragment = parseArticleHtmlFragment(window, recoveredHtml);
	const textContent = normalizeMeaningfulText(documentFragment.body.textContent);

	return {
		...firstPassArticle,
		content: recoveredHtml,
		textContent,
		length: textContent.length,
		excerpt: textContent.substring(0, 200),
	};
}

function prepareDocumentForReadability(document, recoveryApi) {
	// Unwrap headers from anchor tags to prevent Readability from filtering them
	// (matching production code behavior)
	document.querySelectorAll('a')?.forEach(anchor => {
		const heading = Array.from(anchor.children).find(child => /^H[1-6]$/.test(child.nodeName));
		if (heading && anchor.children.length === 1) {
			// If the anchor only contains a heading, unwrap it
			anchor.parentNode.insertBefore(heading, anchor);
			anchor.parentNode.removeChild(anchor);
		}
	});

	// Process headers to avoid Readability.js stripping them
	// (matching production code behavior)
	document.querySelectorAll('h1, h2, h3, h4, h5, h6')?.forEach(header => {
		header.className = '';
		header.outerHTML = header.outerHTML;
	});

	recoveryApi.annotateStructuralAnchors(document);
}

function parseArticle(html, url = 'https://example.com') {
	const env = createBrowserEnvironment();
	const recoveryApi = env.ReadabilityRecovery;

	// Parse HTML in JSDOM
	const dom = new JSDOM(html, { url });
	prepareDocumentForReadability(dom.window.document, recoveryApi);

	const firstPassDom = new JSDOM(dom.serialize(), { url });
	const firstPassReader = new env.Readability(firstPassDom.window.document);
	const firstPassArticle = firstPassReader.parse();

	let article = firstPassArticle;

	if (firstPassArticle?.content) {
		const recoveryPlan = recoveryApi.analyzeNarrowExtraction(dom.window.document, firstPassArticle.content);
		if (recoveryPlan) {
			const secondPassDom = new JSDOM(html, { url });
			prepareDocumentForReadability(secondPassDom.window.document, recoveryApi);

			const recoveryResult = recoveryApi.applyRepeatedSectionPromotion(secondPassDom.window.document, recoveryPlan);
			if (recoveryResult.changed) {
				const recoveryFragment = recoveryApi.buildRepeatedSectionFragment
					? recoveryApi.buildRepeatedSectionFragment(secondPassDom.window.document, recoveryPlan)
					: null;
				const secondPassArticle = recoveryFragment?.html
					? buildRecoveredArticle(secondPassDom.window, firstPassArticle, recoveryFragment.html)
					: null;

				if (secondPassArticle?.content) {
					const secondPassTextLength = meaningfulTextLengthFromArticleHtml(
						secondPassDom.window,
						secondPassArticle.content,
					);
					const firstPassTextLength = recoveryPlan.extractedTextLength
						|| meaningfulTextLengthFromArticleHtml(dom.window, firstPassArticle.content);
					const recoveredGrowth = secondPassTextLength - firstPassTextLength;
					const recoveredMissingContent = articleHtmlContainsAnyWitness(
						secondPassDom.window,
						secondPassArticle.content,
						recoveryPlan.missingWitnessIds,
						recoveryApi.anchorAttribute,
					);
					const recoveredLinkDensity = linkDensityFromArticleHtml(secondPassDom.window, secondPassArticle.content);
					const keepsComparableLength = secondPassTextLength >= firstPassTextLength * 0.9;

					if (
						recoveredGrowth >= Math.max(400, firstPassTextLength * 0.2)
						&& recoveredMissingContent
						&& recoveredLinkDensity <= 0.4
						&& keepsComparableLength
					) {
						article = secondPassArticle;
					}
				}
			}
		}
	}

	if (article?.content) {
		let recoveredContent = article.content;

		const restoredTableContent = typeof recoveryApi.restoreSemanticTables === 'function'
			? recoveryApi.restoreSemanticTables(dom.window.document, recoveredContent)
			: null;
		if (restoredTableContent) {
			recoveredContent = restoredTableContent;
		}

		const restoredHeadingContent = typeof recoveryApi.restoreMissingPrimaryHeadings === 'function'
			? recoveryApi.restoreMissingPrimaryHeadings(dom.window.document, recoveredContent)
			: null;
		if (restoredHeadingContent) {
			recoveredContent = restoredHeadingContent;
		}

		if (recoveredContent !== article.content) {
			article = buildRecoveredArticle(dom.window, article, recoveredContent);
		}
		article.content = recoveryApi.stripStructuralAnchorsFromHtml(article.content);
	}

	return { article, env };
}

export {
	createBrowserEnvironment,
	createTurndownService,
	parseArticle,
};
