import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { exit } from 'node:process';

const SRC_DIR = resolve(import.meta.dirname, '..');
const ROOT_DIR = resolve(SRC_DIR, '..');
const PACKAGE_PATH = join(ROOT_DIR, 'package.json');
const CHANGELOG_PATH = join(ROOT_DIR, 'CHANGELOG.md');
const OUTPUT_PATH = join(SRC_DIR, 'shared', 'release-highlights.json');
const USER_HIGHLIGHTS_HEADING = 'user highlights';
const SEMVER_HEADING_PATTERN = /^##\s+(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)\s*$/;

type ReleaseSections = Record<string, string[]>;

type ReleaseHighlightsAsset = {
	generatedAt: string;
	source: 'CHANGELOG.md';
	versions: ReleaseSections;
};

type GenerateReleaseHighlightsOptions = {
	packagePath?: string;
	changelogPath?: string;
	outputPath?: string;
};

export function normalizeBulletText(line: string): string {
	return line
		.replace(/^\s*-\s+/, '')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

export function extractReleaseSections(changelogText: string): ReleaseSections {
	const lines = changelogText.split(/\r?\n/);
	const versions: ReleaseSections = {};
	let currentVersion: string | null = null;
	let topLevelBullets: string[] = [];
	let userHighlights: string[] = [];
	let currentSubheading: string | null = null;

	function commitCurrentVersion() {
		if (!currentVersion) {
			return;
		}

		versions[currentVersion] = userHighlights.length > 0 ? userHighlights : topLevelBullets;
	}

	for (const line of lines) {
		const headingMatch = line.match(SEMVER_HEADING_PATTERN);
		if (headingMatch) {
			commitCurrentVersion();
			currentVersion = headingMatch[1];
			topLevelBullets = [];
			userHighlights = [];
			currentSubheading = null;
			continue;
		}

		if (!currentVersion) {
			continue;
		}

		const subheadingMatch = line.match(/^###\s+(.+?)\s*$/);
		if (subheadingMatch) {
			currentSubheading = subheadingMatch[1].trim().toLowerCase();
			continue;
		}

		if (/^\s*-\s+/.test(line)) {
			const normalizedBullet = normalizeBulletText(line);
			if (normalizedBullet) {
				if (currentSubheading === USER_HIGHLIGHTS_HEADING) {
					userHighlights.push(normalizedBullet);
				} else if (currentSubheading === null) {
					topLevelBullets.push(normalizedBullet);
				}
			}
		}
	}

	commitCurrentVersion();

	return versions;
}

export function buildReleaseHighlightsAsset(
	changelogText: string,
	manifestVersion: string,
	maxHighlights = 5,
): ReleaseHighlightsAsset {
	const versions = extractReleaseSections(changelogText);
	const currentHighlights = versions[manifestVersion];

	if (!Array.isArray(currentHighlights) || currentHighlights.length === 0) {
		throw new Error(`CHANGELOG.md is missing release highlights for manifest version ${manifestVersion}`);
	}

	const normalizedVersions: ReleaseSections = {};
	for (const [version, highlights] of Object.entries(versions)) {
		if (!Array.isArray(highlights) || highlights.length === 0) {
			continue;
		}
		normalizedVersions[version] = highlights.slice(0, maxHighlights);
	}

	return {
		generatedAt: new Date().toISOString(),
		source: 'CHANGELOG.md',
		versions: normalizedVersions,
	};
}

export function generateReleaseHighlights(
	options: GenerateReleaseHighlightsOptions = {},
): ReleaseHighlightsAsset {
	const packagePath = options.packagePath || PACKAGE_PATH;
	const changelogPath = options.changelogPath || CHANGELOG_PATH;
	const outputPath = options.outputPath || OUTPUT_PATH;

	const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
	const changelog = readFileSync(changelogPath, 'utf8');
	const asset = buildReleaseHighlightsAsset(changelog, pkg.version);

	mkdirSync(dirname(outputPath), { recursive: true });
	writeFileSync(outputPath, `${JSON.stringify(asset, null, '\t')}\n`, 'utf8');

	return asset;
}

if (import.meta.main) {
	try {
		const asset = generateReleaseHighlights();
		console.log(
			`Generated release highlights for ${Object.keys(asset.versions).length} version(s): ${
				relative(SRC_DIR, OUTPUT_PATH)
			}`,
		);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		exit(1);
	}
}
