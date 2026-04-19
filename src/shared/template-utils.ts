function getMomentLibrary(deps: { moment?: ((value: Date) => { format(pattern: string): string }) | null } = {}) {
	if (typeof deps.moment === 'function') {
		return deps.moment;
	}

	if (typeof globalThis.moment === 'function') {
		return globalThis.moment;
	}

	return null;
}

export function formatDate(
	now: Date,
	format: string,
	deps: { moment?: ((value: Date) => { format(pattern: string): string }) | null } = {},
): string {
	const momentLibrary = getMomentLibrary(deps);
	if (typeof momentLibrary === 'function') {
		return momentLibrary(now).format(format);
	}

	if (format === 'YYYY-MM-DD') {
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	return now.toISOString();
}

export function generateValidFileName(title: unknown, disallowedChars: string | null = null): string | null {
	if (!title) {
		return title === null ? null : String(title ?? '');
	}

	let normalizedTitle = String(title);
	const illegalCharacters = /[\/\?<>\\:\*\|":]/g;
	let name = normalizedTitle.replace(illegalCharacters, '').replace(/\u00A0/g, ' ');

	if (disallowedChars !== null && disallowedChars !== '') {
		for (const character of disallowedChars) {
			const escapedCharacter = `[\\^$.|?*+()`.includes(character)
				? `\\${character}`
				: character;
			name = name.replace(new RegExp(escapedCharacter, 'g'), '');
		}
	}

	return name;
}

export function textReplace(
	value: string,
	article: Record<string, unknown>,
	disallowedChars: string | null = null,
	deps: { moment?: ((value: Date) => { format(pattern: string): string }) | null } = {},
): string {
	let nextValue = String(value ?? '');

	for (const key in article) {
		if (!Object.prototype.hasOwnProperty.call(article, key) || key === 'content') {
			continue;
		}

		let replacement = String(article[key] ?? '');
		if (replacement !== '' && disallowedChars !== null && disallowedChars !== '') {
			replacement = generateValidFileName(replacement, disallowedChars) ?? '';
		}

		nextValue = nextValue.replace(new RegExp(`{${key}}`, 'g'), replacement)
			.replace(new RegExp(`{${key}:kebab}`, 'g'), replacement.replace(/ /g, '-').toLowerCase())
			.replace(new RegExp(`{${key}:snake}`, 'g'), replacement.replace(/ /g, '_').toLowerCase())
			.replace(
				new RegExp(`{${key}:camel}`, 'g'),
				replacement.replace(/ ./g, (segment) => segment.trim().toUpperCase()).replace(
					/^./,
					(segment) => segment.toLowerCase(),
				),
			)
			.replace(
				new RegExp(`{${key}:pascal}`, 'g'),
				replacement.replace(/ ./g, (segment) => segment.trim().toUpperCase()).replace(
					/^./,
					(segment) => segment.toUpperCase(),
				),
			);
	}

	const now = new Date();
	const dateMatches = nextValue.match(/{date:(.+?)}/g);
	if (Array.isArray(dateMatches)) {
		dateMatches.forEach((match) => {
			const format = match.substring(6, match.length - 1);
			nextValue = nextValue.replaceAll(match, formatDate(now, format, deps));
		});
	}

	const keywordMatches = nextValue.match(/{keywords:?(.*)?}/g);
	if (Array.isArray(keywordMatches)) {
		keywordMatches.forEach((match) => {
			let separator = match.substring(10, match.length - 1);
			try {
				separator = JSON.parse(JSON.stringify(separator).replace(/\\\\/g, '\\'));
			} catch {
			}

			const keywordsSource = Array.isArray(article.keywords) ? article.keywords : [];
			const keywords = keywordsSource.map((keyword) => String(keyword ?? ''));
			nextValue = nextValue.replace(new RegExp(match.replace(/\\/g, '\\\\'), 'g'), keywords.join(separator));
		});
	}

	return nextValue.replace(/{(.*?)}/g, '');
}

const templateUtils = {
	textReplace,
	generateValidFileName,
};

export default templateUtils;
