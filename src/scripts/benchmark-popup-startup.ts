import fs, { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { type BrowserContext, chromium, type Page, type Route, type Worker } from 'playwright/test';
const fixture = new URL('/extension/deterministic-article.html', 'https://fixtures.snipsnip.test');
const fixtureUrl = fixture.href; //
const fixtureFile = join(import.meta.dirname, '../tests/fixtures/e2e-pages/extension/deterministic-article.html');
const clipSentinel = 'This page is routed by Playwright for deterministic extension E2E tests.';

type Target = { label: string; extensionPath: string };

type RunMetrics = {
	shellVisibleMs: number;
	editorReadyMs: number;
	clipRenderedMs: number;
	libraryBadgeReadyMs: number;
	notificationVisibleMs: number;
};

type MetricSummary = { min: number; median: number; p95: number; mean: number; max: number };

type RunSummary = Record<keyof RunMetrics, MetricSummary>;

function parseCliArgs(argv: string[]) {
	const { values } = parseArgs({
		args: argv,
		options: {
			iterations: { type: 'string', default: '10' },
			warmup: { type: 'string', default: '1' },
			current: { type: 'string', multiple: true, default: [] },
			baseline: { type: 'string', multiple: true, default: [] },
			'extension-path': { type: 'string', multiple: true, default: [] },
		},
		strict: true,
	});

	const iterations = Number(values.iterations);
	const warmup = Number(values.warmup);

	if (!Number.isFinite(iterations) || iterations < 1) {
		throw new Error(`Invalid --iterations value: ${values.iterations}`);
	}
	if (!Number.isFinite(warmup) || warmup < 0) {
		throw new Error(`Invalid --warmup value: ${values.warmup}`);
	}

	const targets = [
		...(values.current ?? []).map((p) => ({ label: 'current', extensionPath: resolve(p) })),
		...(values.baseline ?? []).map((p) => ({ label: 'baseline', extensionPath: resolve(p) })),
		...(values['extension-path'] ?? []).map((p) => ({ label: 'target', extensionPath: resolve(p) })),
	];

	if (targets.length === 0) {
		targets.push({
			label: 'current',
			extensionPath: resolve(join(import.meta.dirname, '../..')),
		});
	}

	return { iterations, warmup, targets };
}

async function installFixtureRoutes(context: BrowserContext) {
	await context.route(`${fixture.origin}/**`, async (route: Route) => {
		const url = new URL(route.request().url());
		if (url.pathname !== fixture.pathname) {
			await route.fulfill({
				status: 404,
				contentType: 'text/plain; charset=utf-8',
				body: `Fixture not found for ${url.pathname}`,
			});
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: 'text/html; charset=utf-8',
			body: fs.readFileSync(fixtureFile, 'utf8'),
		});
	});
}

async function loadExtensionContext(extensionPath: string) {
	const userDataDir = mkdtempSync(join(tmpdir(), 'snipsnip-popup-bench-'));

	const context = await chromium.launchPersistentContext(userDataDir, {
		headless: false,
		args: [
			`--disable-extensions-except=${extensionPath}`,
			`--load-extension=${extensionPath}`,
		],
	});

	await installFixtureRoutes(context);
	let [serviceWorker] = context.serviceWorkers();
	if (!serviceWorker) {
		serviceWorker = await context.waitForEvent('serviceworker', { timeout: 60000 });
	}

	const extensionId = new URL(serviceWorker.url()).host;
	return { context, serviceWorker, extensionId, userDataDir };
}

async function resetPopupBenchmarkState(serviceWorker: Worker) {
	await serviceWorker.evaluate(async () => {
		await browser.storage.local.clear();
		await browser.storage.sync.clear();

		await browser.storage.local.set({
			librarySettings: {
				enabled: true,
				autoSaveOnPopupOpen: false,
				itemsToKeep: 10,
			},
			libraryItems: [{
				id: 'bench-one',
				pageUrl: 'https://example.com/alpha',
				normalizedPageUrl: 'https://example.com/alpha',
				title: 'Alpha',
				markdown: '# Alpha',
				savedAt: '2026-03-20T10:00:00.000Z',
				previewText: 'Alpha',
			}, {
				id: 'bench-two',
				pageUrl: 'https://example.com/beta',
				normalizedPageUrl: 'https://example.com/beta',
				title: 'Beta',
				markdown: '# Beta',
				savedAt: '2026-03-20T09:00:00.000Z',
				previewText: 'Beta',
			}, {
				id: 'bench-three',
				pageUrl: 'https://example.com/gamma',
				normalizedPageUrl: 'https://example.com/gamma',
				title: 'Gamma',
				markdown: '# Gamma',
				savedAt: '2026-03-20T08:00:00.000Z',
				previewText: 'Gamma',
			}],
			pendingNotifications: [{
				id: 'popup-benchmark-notification',
				type: 'support-milestone',
				title: 'Benchmark notification',
				message: 'Deferred popup notification benchmark body',
				milestone: 100,
				primaryAction: {
					label: 'View release notes',
					url: 'https://example.com/releases',
				},
				secondaryAction: {
					label: 'Buy Me a Coffee',
					url: 'https://example.com/support',
				},
			}],
		});
	});
}

async function waitForMetric<Arg = unknown>(
	page: Page,
	pageFunction: (arg: Arg) => unknown,
	timeout: number,
	arg: Arg = null as Arg,
): Promise<number> {
	const handle = await page.waitForFunction(pageFunction as never, arg, {
		timeout,
		polling: 'raf',
	});
	const value = await handle.jsonValue();
	await handle.dispose();
	return Number(value);
}

async function runIteration({ context, serviceWorker, extensionId }: {
	context: BrowserContext;
	serviceWorker: Worker;
	extensionId: string;
}): Promise<RunMetrics> {
	await resetPopupBenchmarkState(serviceWorker);

	const fixturePage = await context.newPage();
	const popupPage = await context.newPage();

	try {
		await fixturePage.goto(fixtureUrl);
		await fixturePage.waitForLoadState('networkidle');
		await fixturePage.bringToFront();

		await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

		const shellVisibleMs = await waitForMetric(
			popupPage,
			() => {
				const el = document.getElementById('container');
				return el && getComputedStyle(el).display !== 'none' ? performance.now() : 0;
			},
			15000,
		);

		const editorReadyMs = await waitForMetric(
			popupPage,
			() => {
				const cm = (window as typeof window & { cm?: { getValue?: () => unknown } }).cm;
				if (cm && typeof cm.getValue === 'function') {
					return performance.now();
				}
				return document.querySelector('.cm-editor') ? performance.now() : 0;
			},
			15000,
		);

		const clipRenderedMs = await waitForMetric(
			popupPage,
			(needle) => {
				const titleValue = document.querySelector<HTMLInputElement>('#title')?.value || '';
				const textareaValue = document.querySelector<HTMLTextAreaElement>('#md')?.value || '';
				const codeMirrorText = document.querySelector('.cm-content')?.textContent || '';
				return (
						titleValue.includes('Deterministic Markdown Fixture')
						|| textareaValue.includes(needle)
						|| codeMirrorText.includes(needle)
					)
					? performance.now()
					: 0;
			},
			45000,
			clipSentinel,
		);

		const libraryBadgeReadyMs = await waitForMetric(
			popupPage,
			() => {
				const badge = document.getElementById('libraryCountBadge');
				return badge && badge.textContent.trim() === '3' ? performance.now() : 0;
			},
			10000,
		);

		const notificationVisibleMs = await waitForMetric(
			popupPage,
			() => {
				const text = Array.from(document.querySelectorAll('*'))
					.map((element) => element.shadowRoot?.textContent || '')
					.join('\n');
				return text.includes('Benchmark notification') ? performance.now() : 0;
			},
			15000,
		);

		return {
			shellVisibleMs,
			editorReadyMs,
			clipRenderedMs,
			libraryBadgeReadyMs,
			notificationVisibleMs,
		};
	} finally {
		await popupPage.close().catch(() => {});
		await fixturePage.close().catch(() => {});
	}
}

function percentile(values: number[], p: number): number {
	const sorted = values.slice().sort((a, b) => a - b);
	const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
	return sorted[index];
}

function round(value: number): number {
	return Math.round(value * 10) / 10;
}

function summarizeMetric(values: number[]): MetricSummary {
	const sorted = values.slice().sort((a, b) => a - b);
	const sum = sorted.reduce((total, value) => total + value, 0);
	return {
		min: round(sorted[0]),
		median: round(percentile(sorted, 0.5)),
		p95: round(percentile(sorted, 0.95)),
		mean: round(sum / sorted.length),
		max: round(sorted[sorted.length - 1]),
	};
}

function summarizeRuns(runs: RunMetrics[]): RunSummary {
	const metrics = Object.keys(runs[0]) as (keyof RunMetrics)[];
	return metrics.reduce((summary, metric) => {
		summary[metric] = summarizeMetric(runs.map((run) => run[metric]));
		return summary;
	}, {} as RunSummary);
}

function printTargetSummary(label: string, summary: RunSummary): void {
	console.log(`\n${label.toUpperCase()}`);
	for (const [metric, stats] of Object.entries(summary) as [string, MetricSummary][]) {
		console.log(
			`  ${metric}: median=${stats.median}ms p95=${stats.p95}ms mean=${stats.mean}ms min=${stats.min}ms max=${stats.max}ms`,
		);
	}
}

function printComparison(currentSummary: RunSummary, baselineSummary: RunSummary): void {
	console.log('\nCOMPARISON (positive % means current is faster)');
	for (const metric of Object.keys(currentSummary) as (keyof RunMetrics)[]) {
		const baselineMedian = baselineSummary[metric].median;
		const currentMedian = currentSummary[metric].median;
		const deltaMs = round(baselineMedian - currentMedian);
		const deltaPct = baselineMedian === 0 ? 0 : round((deltaMs / baselineMedian) * 100);
		console.log(
			`  ${metric}: current=${currentMedian}ms baseline=${baselineMedian}ms delta=${deltaMs}ms (${deltaPct}%)`,
		);
	}
}

type BenchmarkResult = { target: Target; runs: RunMetrics[]; summary: RunSummary };

async function benchmarkTarget(target: Target, iterations: number, warmup: number): Promise<BenchmarkResult> {
	const loaded = await loadExtensionContext(target.extensionPath);
	try {
		const runs: RunMetrics[] = [];
		const totalRuns = warmup + iterations;
		for (let index = 0; index < totalRuns; index++) {
			const run = await runIteration(loaded);
			const runNumber = index + 1;
			const warmupLabel = index < warmup ? 'warmup' : `run ${runNumber - warmup}/${iterations}`;
			console.log(
				`${target.label} ${warmupLabel}: shell=${round(run.shellVisibleMs)}ms editor=${
					round(run.editorReadyMs)
				}ms clip=${round(run.clipRenderedMs)}ms library=${round(run.libraryBadgeReadyMs)}ms notification=${
					round(run.notificationVisibleMs)
				}ms`,
			);
			if (index >= warmup) {
				runs.push(run);
			}
		}

		return {
			target,
			runs,
			summary: summarizeRuns(runs),
		};
	} finally {
		await loaded.context.close();
		fs.rmSync(loaded.userDataDir, { recursive: true, force: true });
	}
}

async function main() {
	const options = parseCliArgs(process.argv.slice(2));
	const results: BenchmarkResult[] = [];

	for (const target of options.targets) {
		console.log(`\nBenchmarking ${target.label} at ${target.extensionPath}`);
		results.push(await benchmarkTarget(target, options.iterations, options.warmup));
	}

	for (const result of results) {
		printTargetSummary(result.target.label, result.summary);
	}

	if (results.length === 2) {
		const current = results.find((result) => result.target.label === 'current');
		const baseline = results.find((result) => result.target.label === 'baseline');
		if (current && baseline) {
			printComparison(current.summary, baseline.summary);
		}
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
