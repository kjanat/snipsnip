const legacyPagePaths = {
	guide: 'guide/guide.html',
	options: 'options/options.html',
};

const wxtPagePaths = {
	guide: 'guide.html',
	options: 'options.html',
};

export function installWxtPagePaths(): void {
	globalThis.snipSnipPagePaths ??= wxtPagePaths;
}

export function getGuidePagePath(): string {
	return globalThis.snipSnipPagePaths?.guide ?? legacyPagePaths.guide;
}

export function getOptionsPagePath(): string {
	return globalThis.snipSnipPagePaths?.options ?? legacyPagePaths.options;
}

export function getGuidePageHref(): string {
	return `/${getGuidePagePath()}`;
}

export function getOptionsPageHref(): string {
	return `/${getOptionsPagePath()}`;
}
