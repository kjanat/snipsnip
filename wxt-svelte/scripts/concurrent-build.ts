#!/usr/bin/env bun
async function runBuilds() {
	const chromeBuild = Bun.spawn(['bun', 'run', 'build:chrome']);
	const firefoxBuild = Bun.spawn(['bun', 'run', 'build:firefox']);

	await Promise.all([chromeBuild.exited, firefoxBuild.exited]);
	console.log('Both builds completed!');
}

if (import.meta.main) {
	runBuilds();
}
