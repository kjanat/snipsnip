import type { Extension } from '@codemirror/state';
import type { EditorTheme } from './types.ts';

/**
 * Lazy-loaded theme registry. Each entry imports its theme module only on first `load()`
 * call, keeping the initial popup bundle small.
 */
const themes: Record<string, EditorTheme> = {
	'default': { name: 'default', isDark: false, load: () => import('./default.ts').then((m) => m.default) },

	'atla-dark': { name: 'atla-dark', isDark: true, load: () => import('./atla-dark.ts').then((m) => m.default) },
	'atla-light': { name: 'atla-light', isDark: false, load: () => import('./atla-light.ts').then((m) => m.default) },

	'ben10-dark': { name: 'ben10-dark', isDark: true, load: () => import('./ben10-dark.ts').then((m) => m.default) },
	'ben10-light': { name: 'ben10-light', isDark: false, load: () => import('./ben10-light.ts').then((m) => m.default) },

	'claude-dark': { name: 'claude-dark', isDark: true, load: () => import('./claude-dark.ts').then((m) => m.default) },
	'claude-light': { name: 'claude-light', isDark: false, load: () => import('./claude-light.ts').then((m) => m.default) },

	'colorblind-deuteranopia-dark': {
		name: 'colorblind-deuteranopia-dark',
		isDark: true,
		load: () => import('./colorblind-deuteranopia-dark.ts').then((m) => m.default),
	},
	'colorblind-deuteranopia-light': {
		name: 'colorblind-deuteranopia-light',
		isDark: false,
		load: () => import('./colorblind-deuteranopia-light.ts').then((m) => m.default),
	},
	'colorblind-protanopia-dark': {
		name: 'colorblind-protanopia-dark',
		isDark: true,
		load: () => import('./colorblind-protanopia-dark.ts').then((m) => m.default),
	},
	'colorblind-protanopia-light': {
		name: 'colorblind-protanopia-light',
		isDark: false,
		load: () => import('./colorblind-protanopia-light.ts').then((m) => m.default),
	},
	'colorblind-tritanopia-dark': {
		name: 'colorblind-tritanopia-dark',
		isDark: true,
		load: () => import('./colorblind-tritanopia-dark.ts').then((m) => m.default),
	},
	'colorblind-tritanopia-light': {
		name: 'colorblind-tritanopia-light',
		isDark: false,
		load: () => import('./colorblind-tritanopia-light.ts').then((m) => m.default),
	},

	'dracula': { name: 'dracula', isDark: true, load: () => import('./dracula.ts').then((m) => m.default) },

	'material': { name: 'material', isDark: true, load: () => import('./material.ts').then((m) => m.default) },
	'material-darker': {
		name: 'material-darker',
		isDark: true,
		load: () => import('./material-darker.ts').then((m) => m.default),
	},

	'monokai': { name: 'monokai', isDark: true, load: () => import('./monokai.ts').then((m) => m.default) },
	'nord': { name: 'nord', isDark: true, load: () => import('./nord.ts').then((m) => m.default) },

	'openai-dark': { name: 'openai-dark', isDark: true, load: () => import('./openai-dark.ts').then((m) => m.default) },
	'openai-light': {
		name: 'openai-light',
		isDark: false,
		load: () => import('./openai-light.ts').then((m) => m.default),
	},

	'perplexity-dark': {
		name: 'perplexity-dark',
		isDark: true,
		load: () => import('./perplexity-dark.ts').then((m) => m.default),
	},
	'perplexity-light': {
		name: 'perplexity-light',
		isDark: false,
		load: () => import('./perplexity-light.ts').then((m) => m.default),
	},

	// Legacy stylesheet map used the space-separated "solarized dark" / "solarized light" keys;
	// both forms are registered so popup.ts's existing resolveEditorTheme() output still matches.
	'solarized dark': {
		name: 'solarized dark',
		isDark: true,
		load: () => import('./solarized-dark.ts').then((m) => m.default),
	},
	'solarized-dark': {
		name: 'solarized-dark',
		isDark: true,
		load: () => import('./solarized-dark.ts').then((m) => m.default),
	},
	'solarized light': {
		name: 'solarized light',
		isDark: false,
		load: () => import('./solarized-light.ts').then((m) => m.default),
	},
	'solarized-light': {
		name: 'solarized-light',
		isDark: false,
		load: () => import('./solarized-light.ts').then((m) => m.default),
	},

	'twilight': { name: 'twilight', isDark: true, load: () => import('./twilight.ts').then((m) => m.default) },

	'xq-dark': { name: 'xq-dark', isDark: true, load: () => import('./xq-dark.ts').then((m) => m.default) },
	'xq-light': { name: 'xq-light', isDark: false, load: () => import('./xq-light.ts').then((m) => m.default) },
};

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
