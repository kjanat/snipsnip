import type { Extension } from '@codemirror/state';
import type { EditorTheme } from './types.ts';

/**
 * Lazy-loaded theme registry. Each entry imports its theme module only on first `load()` call,
 * keeping the initial popup bundle small. Themes populated incrementally in Task #8.
 */
const themes: Record<string, EditorTheme> = {
	'default': {
		name: 'default',
		isDark: false,
		load: () => import('./default.ts').then((m) => m.default),
	},
};

/** Register a theme factory at runtime. Used by Task #8's per-theme files. */
export function registerTheme(theme: EditorTheme): void {
	themes[theme.name] = theme;
}

export function getTheme(name: string): EditorTheme | undefined {
	return themes[name];
}

export async function loadTheme(name: string): Promise<Extension[]> {
	const theme = themes[name] ?? themes.default;
	return theme.load();
}

export function listThemes(): EditorTheme[] {
	return Object.values(themes);
}
