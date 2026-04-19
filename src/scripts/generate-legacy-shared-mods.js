const path = require('node:path');

const SHARED_MODULES = [
	{ baseName: 'count-utils', globalName: 'snipSnipCountUtils' },
	{ baseName: 'search-core', globalName: 'snipSnipSearchCore' },
	{ baseName: 'site-rules', globalName: 'snipSnipSiteRules' },
	{ baseName: 'popup-batch-utils', globalName: 'snipSnipPopupBatchUtils' },
	{ baseName: 'notifications', globalName: 'snipSnipNotifications' },
	{ baseName: 'obsidian-utils', globalName: 'snipSnipObsidian' },
	{ baseName: 'download-tracker', globalName: 'snipSnipDownloadTracker' },
];

const sharedDir = path.resolve(__dirname, '../shared');

function indentLines(value, prefix) {
	return value
		.split('\n')
		.map((line) => `${prefix}${line}`)
		.join('\n');
}

(async () => {
	for (const moduleInfo of SHARED_MODULES) {
		const entrypoint = path.join(sharedDir, `${moduleInfo.baseName}.ts`);
		const result = await Bun.build({
			entrypoints: [entrypoint],
			format: 'cjs',
			target: 'browser',
			sourcemap: 'none',
			minify: false,
		});

		if (!result.success) {
			for (const log of result.logs) {
				console.error(log);
			}
			throw new Error(`Failed to build ${moduleInfo.baseName}.ts`);
		}

		const output = result.outputs[0];
		if (output == null) {
			throw new Error(`No bundle output for ${moduleInfo.baseName}.ts`);
		}

		const bundledCode = await output.text();
		const wrappedCode =
			`// GENERATED from ${moduleInfo.baseName}.ts. Edit the TypeScript source only.\n(function(root) {\n\tconst exported = (() => {\n\t\tconst module = { exports: {} };\n${
				indentLines(bundledCode, '\t\t')
			}\n\t\treturn module.exports;\n\t})();\n\tconst api = exported.default ?? exported;\n\troot.${moduleInfo.globalName} = api;\n\tif (typeof module !== 'undefined' && module.exports) {\n\t\tmodule.exports = api;\n\t}\n})(typeof globalThis !== 'undefined' ? globalThis : this);\n`;

		await Bun.write(path.join(sharedDir, `${moduleInfo.baseName}.js`), wrappedCode);
	}
})();
