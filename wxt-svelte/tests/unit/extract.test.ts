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
	test('flattens a frameset document into a link list', async () => {
		loadDocument(FRAMESET_HTML);

		const article = await extractArticle('document');

		expect(article.title).toBe('Master PRO');
		expect(article.content).toContain('<h1>Master PRO</h1>');
		expect(article.content).toContain('href="https://example.test/masterheading.aspx"');
		expect(article.content).toContain('href="https://example.test/masternavigation.aspx"');
		expect(article.content).toContain('href="https://example.test/mastercontent.aspx"');
		expect(article.content).toContain('href="https://example.test/MasterStatus.aspx"');
		expect(article.content).not.toContain('<frameset');
		expect(article.content).not.toContain('<frame ');
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
