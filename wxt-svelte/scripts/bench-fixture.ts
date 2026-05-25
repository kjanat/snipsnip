import { GlobalRegistrator } from '@happy-dom/global-registrator';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, '..', 'tests', 'fixtures', 'complex-table.html');
const outPath = join(here, '..', 'tests', 'fixtures', 'complex-table.out.md');

const raw = await readFile(fixturePath, 'utf8');
const doc = new DOMParser().parseFromString(raw, 'text/html');
const article = new Readability(doc).parse();
const html = article?.content ?? doc.body.innerHTML;
const md = convertHtmlToMarkdown(html, DEFAULT_SETTINGS);

await writeFile(outPath, md, 'utf8');

console.log(`Wrote ${outPath}`);
console.log(`Sizes: html=${html.length}b → md=${md.length}b`);
console.log('--- markdown output ---');
console.log(md);
