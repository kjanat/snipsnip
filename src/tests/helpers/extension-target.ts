const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..', '..');
const defaultExtensionPath = path.join(repoRoot, '.output', 'chrome-mv3');
const popupPagePath = 'popup.html';

function getExtensionPath() {
	const configuredPath = process.env.SNIPSNIP_EXTENSION_PATH;
	const extensionPath = configuredPath
		? path.resolve(repoRoot, configuredPath)
		: defaultExtensionPath;
	const manifestPath = path.join(extensionPath, 'manifest.json');

	if (!fs.existsSync(manifestPath)) {
		throw new Error(
			`Missing built extension at ${extensionPath}. Run \`bun run build:wxt\` or set SNIPSNIP_EXTENSION_PATH.`,
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

module.exports = {
	repoRoot,
	popupPagePath,
	getExtensionPath,
	getExtensionPageUrl,
	getExtensionLaunchArgs,
};
