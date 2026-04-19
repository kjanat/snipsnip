import fs from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '../../..');
const defaultExtensionPath = join(repoRoot, '.output', 'chrome-mv3');
const popupPagePath = 'popup.html';

function getExtensionPath() {
	const configuredPath = process.env.SNIPSNIP_EXTENSION_PATH;
	const extensionPath = configuredPath
		? resolve(repoRoot, configuredPath)
		: defaultExtensionPath;
	const manifestPath = join(extensionPath, 'manifest.json');

	if (!fs.existsSync(manifestPath)) {
		throw new Error(
			`Missing built extension at ${extensionPath}. Run \`bun build:wxt\` or set SNIPSNIP_EXTENSION_PATH.`,
		);
	}

	return extensionPath;
}

function getExtensionPageUrl(extensionId, pagePath = popupPagePath) {
	return `chrome-extension://${extensionId}/${pagePath}`;
}

function getExtensionLaunchArgs() {
	const extensionPath = getExtensionPath();

	return [
		'--ozone-platform=x11',
		`--disable-extensions-except=${extensionPath}`,
		`--load-extension=${extensionPath}`,
	];
}

export { getExtensionLaunchArgs, getExtensionPageUrl, getExtensionPath, popupPagePath, repoRoot };
