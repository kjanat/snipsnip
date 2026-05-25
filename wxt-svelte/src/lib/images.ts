const MD_IMAGE = /(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;
const OBSIDIAN_IMAGE = /!\[\[([^\]]+)\]\]/g;

export interface ImageRef {
	original: string;
	resolved: string;
}

export interface ImageBundleEntry {
	original: string;
	resolved: string;
	localPath: string;
	bytes: Uint8Array;
	mime: string;
}

const SKIP_SCHEMES = ['data:', 'blob:', 'javascript:', 'about:'];

function shouldSkip(url: string): boolean {
	const lower = url.toLowerCase();
	return SKIP_SCHEMES.some((scheme) => lower.startsWith(scheme));
}

function resolveAgainst(url: string, base: string | null): string | null {
	try {
		return base ? new URL(url, base).toString() : new URL(url).toString();
	} catch {
		return null;
	}
}

export function extractImageRefs(markdown: string, baseUrl: string | null = null): ImageRef[] {
	const seen = new Map<string, ImageRef>();

	for (const match of markdown.matchAll(MD_IMAGE)) {
		const original = match[2];
		if (!original || shouldSkip(original)) continue;
		const resolved = resolveAgainst(original, baseUrl);
		if (!resolved || seen.has(resolved)) continue;
		seen.set(resolved, { original, resolved });
	}

	for (const match of markdown.matchAll(OBSIDIAN_IMAGE)) {
		const original = match[1];
		if (!original || shouldSkip(original)) continue;
		const resolved = resolveAgainst(original, baseUrl);
		if (!resolved || seen.has(resolved)) continue;
		seen.set(resolved, { original, resolved });
	}

	return Array.from(seen.values());
}

const MIME_EXT: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
	'image/avif': 'avif',
	'image/bmp': 'bmp',
	'image/tiff': 'tiff',
};

export function extensionFor(mime: string, fallbackUrl: string): string {
	const fromMime = MIME_EXT[mime.split(';')[0]?.trim().toLowerCase() ?? ''];
	if (fromMime) return fromMime;
	try {
		const path = new URL(fallbackUrl).pathname;
		const dot = path.lastIndexOf('.');
		if (dot > 0 && dot < path.length - 1) {
			const ext = path.slice(dot + 1).toLowerCase();
			if (/^[a-z0-9]{2,5}$/.test(ext)) return ext;
		}
	} catch {
		// ignore
	}
	return 'bin';
}

async function digest(input: string): Promise<string> {
	const buffer = new TextEncoder().encode(input);
	const hashed = await crypto.subtle.digest('SHA-1', buffer);
	return Array.from(new Uint8Array(hashed))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('')
		.slice(0, 12);
}

export async function fetchImageBundle(refs: ImageRef[]): Promise<ImageBundleEntry[]> {
	const bundle: ImageBundleEntry[] = [];
	for (const ref of refs) {
		try {
			const response = await fetch(ref.resolved, { redirect: 'follow' });
			if (!response.ok) continue;
			const mime = response.headers.get('content-type') ?? 'application/octet-stream';
			const bytes = new Uint8Array(await response.arrayBuffer());
			const stem = await digest(ref.resolved);
			bundle.push({
				original: ref.original,
				resolved: ref.resolved,
				localPath: `images/${stem}.${extensionFor(mime, ref.resolved)}`,
				bytes,
				mime,
			});
		} catch {
			// skip individual failures, keep clip flowing
		}
	}
	return bundle;
}

export function bytesToDataUri(bytes: Uint8Array, mime: string): string {
	let binary = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
	}
	return `data:${mime};base64,${btoa(binary)}`;
}

export function bytesToText(bytes: Uint8Array): string {
	return new TextDecoder().decode(bytes);
}

function escapeForRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function rewriteImageRefs(
	markdown: string,
	bundle: ImageBundleEntry[],
): string {
	let output = markdown;
	for (const entry of bundle) {
		const pattern = new RegExp(escapeForRegex(entry.original), 'g');
		output = output.replace(pattern, entry.localPath);
	}
	return output;
}
