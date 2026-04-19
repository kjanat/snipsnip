// Runs synchronously before the popup UI paints. Applies the cached theme
// classes to <html> so there's no flash-of-wrong-theme. The editor's syntax
// theme is a CM6 JS extension loaded later — no CSS link to preload here.
(() => {
	const CACHE_KEY = 'snipsnip-popup-theme-cache-v1';
	const root = document.documentElement;
	const specialThemeClassNames = [
		'special-theme-claude',
		'special-theme-perplexity',
		'special-theme-openai',
		'special-theme-atla',
		'special-theme-ben10',
		'special-theme-colorblind',
	];
	const colorBlindVariantClassNames = [
		'colorblind-theme-deuteranopia',
		'colorblind-theme-protanopia',
		'colorblind-theme-tritanopia',
	];
	const accentClassNames = ['accent-sage', 'accent-ocean', 'accent-slate', 'accent-rose', 'accent-amber'];

	function normalizeColorBlindTheme(value: unknown): string {
		return typeof value === 'string' && ['deuteranopia', 'protanopia', 'tritanopia'].includes(value)
			? value
			: 'deuteranopia';
	}

	try {
		const raw = localStorage.getItem(CACHE_KEY);
		const cached = raw ? JSON.parse(raw) : null;
		const popupTheme = typeof cached?.popupTheme === 'string' ? cached.popupTheme : 'system';
		const specialTheme = typeof cached?.specialTheme === 'string' ? cached.specialTheme : 'none';
		const colorBlindTheme = normalizeColorBlindTheme(cached?.colorBlindTheme);
		const popupAccent = typeof cached?.popupAccent === 'string' ? cached.popupAccent : 'sage';

		root.classList.remove('theme-light', 'theme-dark', 'theme-system');
		root.classList.add(`theme-${popupTheme}`);

		root.classList.remove(...specialThemeClassNames);
		root.classList.remove(...colorBlindVariantClassNames);
		if (specialTheme !== 'none') {
			root.classList.add(`special-theme-${specialTheme}`);
			if (specialTheme === 'colorblind') {
				root.classList.add(`colorblind-theme-${colorBlindTheme}`);
			}
		}

		root.classList.toggle('hide-theme-icon', cached?.specialThemeIcon === false);
		root.classList.toggle('hide-popup-theme-toggle', cached?.showThemeToggleInPopup === false);

		root.classList.remove(...accentClassNames);
		if (specialTheme === 'none' && popupAccent !== 'sage') {
			root.classList.add(`accent-${popupAccent}`);
		}
	} catch {
		root.classList.remove('theme-light', 'theme-dark', 'theme-system');
		root.classList.add('theme-system');
	}
})();
