import { extractArticle } from '@/lib/extract';
import { afterEach, describe, expect, test } from 'bun:test';

const FRAMESET_HTML = `<html><head>
	<title>Master PRO</title>
	<link rel="shortcut icon" href="APP_Themes/Default/favicon.ico" type="image/x-icon">
</head>
<frameset id="framesetMASTER" rows="80,*,60" border="0">
	<frame id="heading" name="heading" src="masterheading.aspx" noresize="" scrolling="no">
	<frameset id="framesetNavigationAndContent" cols="220,*" border="0">
		<frame id="navigation" name="navigation" src="masternavigation.aspx" noresize="" scrolling="auto">
		<frame id="content" name="content" src="mastercontent.aspx" noresize="" scrolling="auto">
	</frameset>
	<frame id="status" name="status" src="MasterStatus.aspx" noresize="" scrolling="no">
</frameset>
</html>`;

function loadDocument(markup: string): void {
	const parsed = new DOMParser().parseFromString(markup, 'text/html');
	document.documentElement.innerHTML = parsed.documentElement.innerHTML;
}

afterEach(() => {
	document.documentElement.innerHTML = '<head></head><body></body>';
});

describe('extractArticle frameset handling', () => {
	test('falls back to a link list when frame contents are not accessible', async () => {
		loadDocument(FRAMESET_HTML);

		const article = await extractArticle('document');
		const base = location.origin;

		expect(article.title).toBe('Master PRO');
		expect(article.content).toContain(`href="${base}/masterheading.aspx"`);
		expect(article.content).toContain(`href="${base}/masternavigation.aspx"`);
		expect(article.content).toContain(`href="${base}/mastercontent.aspx"`);
		expect(article.content).toContain(`href="${base}/MasterStatus.aspx"`);
		expect(article.content).not.toContain('<frameset');
		expect(article.content).not.toContain('<frame ');
	});

	test('inlines same-origin iframe bodies into a single document', async () => {
		document.documentElement.innerHTML = '<head><title>Outer</title></head><body></body>';
		// Build the final structure first; moving an iframe in the DOM detaches and
		// re-creates its browsing context, which would discard any document.write below.
		const frameset = document.createElement('frameset');
		const iframe = document.createElement('iframe');
		iframe.name = 'content';
		iframe.src = 'about:blank';
		frameset.appendChild(iframe);
		document.body.appendChild(frameset);

		const innerDoc = iframe.contentDocument!;
		innerDoc.open();
		innerDoc.write(
			'<html><head><title>Inner</title></head><body><article><h1>Tonsillitis</h1>'
				+ '<p>The most common cause of acute tonsillitis is a viral infection that resolves on its own without antibiotics in healthy adults under most circumstances.</p>'
				+ '</article></body></html>',
		);
		innerDoc.close();

		const article = await extractArticle('document');

		expect(article.content).toContain('Tonsillitis');
		expect(article.content).toContain('viral infection');
		expect(article.content).not.toContain('<frameset');
	});

	test('skips frames whose src is empty instead of leaving an empty section', async () => {
		loadDocument(
			'<html><head><title>T</title></head>'
				+ '<frameset><frame name="empty" src=""><frame name="real" src="x.aspx"></frameset></html>',
		);

		const article = await extractArticle('document');
		const base = location.origin;

		expect(article.content).toContain(`href="${base}/x.aspx"`);
		expect(article.content).not.toMatch(/<h\d>empty<\/h\d>\s*<\/section>/);
	});

	test('still extracts a normal article without a frameset', async () => {
		loadDocument(
			'<html><head><title>Hello</title></head><body><article><h1>Hello</h1><p>World body content that should be long enough for Readability to keep it around without rejecting the article as too short.</p></article></body></html>',
		);

		const article = await extractArticle('document');

		expect(article.title).toBe('Hello');
		expect(article.content).toContain('World body content');
	});
});
