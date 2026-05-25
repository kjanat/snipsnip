import { GlobalRegistrator } from '@happy-dom/global-registrator';

const rawFetch = globalThis.fetch.bind(globalThis);
GlobalRegistrator.register({
	url: 'https://example.test/',
	settings: {
		disableJavaScriptFileLoading: true,
		disableJavaScriptEvaluation: true,
		disableCSSFileLoading: true,
		disableIframePageLoading: true,
		disableErrorCapturing: true,
		handleDisabledFileLoadingAsSuccess: true,
	},
});

const { Readability } = await import('@mozilla/readability');
const { convertHtmlToMarkdown } = await import('@/lib/convert');
const { DEFAULT_SETTINGS } = await import('@/lib/defaults');

interface TestCase {
	name: string;
	url: string;
	difficulty: string;
}

const TARGETS: TestCase[] = [
	{
		name: 'Wikipedia — Lisp (programming language)',
		url: 'https://en.wikipedia.org/wiki/Lisp_(programming_language)',
		difficulty: 'infobox, citations, deep nesting, sidebar noise',
	},
	{
		name: 'MDN — Array reference',
		url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
		difficulty: 'structured tables, code blocks, nav chrome',
	},
	{
		name: 'Hacker News front page',
		url: 'https://news.ycombinator.com/',
		difficulty: 'table-based layout, many short items, no article semantics',
	},
	{
		name: 'Stack Overflow — famous timezone question',
		url:
			'https://stackoverflow.com/questions/6841333/why-is-subtracting-these-two-times-in-1927-giving-a-strange-result',
		difficulty: 'user HTML, code blocks, answers below question',
	},
	{
		name: 'arXiv abstract page',
		url: 'https://arxiv.org/abs/2408.03314',
		difficulty: 'academic, math markup, metadata sidebars',
	},
	{
		name: 'BBC News homepage',
		url: 'https://www.bbc.com/news',
		difficulty: 'news site, heavy nav, featured-story tiles not article body',
	},
	{
		name: 'GitHub repo README (SPA)',
		url: 'https://github.com/vercel/next.js',
		difficulty: 'React SPA — README content is fetched after initial HTML load',
	},
	{
		name: 'Substack post',
		url: 'https://bytebytego.substack.com/p/how-does-a-modern-search-engine-work',
		difficulty: 'paywall, tracking pixels, author cards, related posts',
	},
	{
		name: 'The Verge article',
		url: 'https://www.theverge.com/24333909/verge-most-used-websites-internet-2024',
		difficulty: 'Vox platform, author/category chrome, inline embeds',
	},
];

interface Stats {
	rawKb: string;
	mdKb: string;
	compression: string;
	title: string;
	headings: number;
	codeBlocks: number;
	links: number;
	images: number;
	tableRows: number;
	firstChars: string;
}

async function run(target: TestCase): Promise<void> {
	try {
		const res = await rawFetch(target.url, {
			redirect: 'follow',
			headers: {
				'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) SnipSnipBench/0.1 (+https://github.com/kjanat/snipsnip)',
				Accept: 'text/html,application/xhtml+xml',
			},
		});
		if (!res.ok) {
			console.log(`--- ${target.name}`);
			console.log(`  HTTP ${res.status} — skipped`);
			return;
		}
		const raw = await res.text();
		const doc = new DOMParser().parseFromString(raw, 'text/html');
		const article = new Readability(doc).parse();
		const html = article?.content ?? doc.body.innerHTML;
		const md = convertHtmlToMarkdown(html, DEFAULT_SETTINGS);

		const stats: Stats = {
			rawKb: (raw.length / 1024).toFixed(1),
			mdKb: (md.length / 1024).toFixed(1),
			compression: `${((md.length / raw.length) * 100).toFixed(1)}%`,
			title: article?.title?.slice(0, 80) ?? '(no title)',
			headings: (md.match(/^#+\s/gm) ?? []).length,
			codeBlocks: Math.floor((md.match(/```/g) ?? []).length / 2),
			links: (md.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length,
			images: (md.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length,
			tableRows: (md.match(/^\|.+\|$/gm) ?? []).length,
			firstChars: md.slice(0, 280).replace(/\n+/g, ' / '),
		};

		console.log(`--- ${target.name}`);
		console.log(`  URL       ${target.url}`);
		console.log(`  tricky    ${target.difficulty}`);
		console.log(`  sizes     raw ${stats.rawKb} KB → md ${stats.mdKb} KB (${stats.compression})`);
		console.log(`  title     ${stats.title}`);
		console.log(
			`  structure ${stats.headings} headings · ${stats.codeBlocks} code blocks · ${stats.links} links · ${stats.images} images · ${stats.tableRows} table rows`,
		);
		console.log(`  opening   ${stats.firstChars}…`);
		console.log();
	} catch (e) {
		console.log(`--- ${target.name}`);
		console.log(`  [ERROR] ${e instanceof Error ? e.message : String(e)}`);
		console.log();
	}
}

for (const target of TARGETS) {
	await run(target);
}
