declare module '../../browser-polyfill.min.js' {
	import type { ExtensionBrowserApi } from '../types/index.ts';

	const browserApi: ExtensionBrowserApi;
	export default browserApi;
}

declare module '../../highlight.min.js' {
	import type { HighlightApi } from '../types/index.ts';

	const highlightApi: HighlightApi;
	export default highlightApi;
}

declare module '../../background/moment.min.js' {
	import type { MomentApi } from '../types/index.ts';

	const momentApi: MomentApi;
	export default momentApi;
}

declare module '../../background/Readability.js' {
	import type { ReadabilityApi } from '../types/index.ts';

	const readabilityApi: ReadabilityApi;
	export default readabilityApi;
}

declare module '../../background/turndown.js' {
	import type { TurndownServiceApi } from '../types/index.ts';

	const turndownServiceApi: TurndownServiceApi;
	export default turndownServiceApi;
}

declare module '../../background/turndown-plugin-gfm.js' {
	import type { TurndownPluginGfmApi } from '../types/index.ts';

	const turndownPluginGfmApi: TurndownPluginGfmApi;
	export default turndownPluginGfmApi;
}
