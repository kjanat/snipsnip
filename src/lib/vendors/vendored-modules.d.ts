declare module '@/browser-polyfill.min' {
	import type { ExtensionBrowserApi } from '@/lib/types';

	const browserApi: ExtensionBrowserApi;
	export default browserApi;
}

declare module '@/highlight.min' {
	import type { HighlightApi } from '@/lib/types';

	const highlightApi: HighlightApi;
	export default highlightApi;
}

declare module '@/background/moment.min' {
	import type { MomentApi } from '@/lib/types';

	const momentApi: MomentApi;
	export default momentApi;
}

declare module '@/background/Readability' {
	import type { ReadabilityApi } from '@/lib/types';

	const readabilityApi: ReadabilityApi;
	export default readabilityApi;
}

declare module '@/background/turndown' {
	import type { TurndownServiceApi } from '@/lib/types';

	const turndownServiceApi: TurndownServiceApi;
	export default turndownServiceApi;
}

declare module '@/background/turndown-plugin-gfm' {
	import type { TurndownPluginGfmApi } from '@/lib/types';

	const turndownPluginGfmApi: TurndownPluginGfmApi;
	export default turndownPluginGfmApi;
}

declare module '@/background/apache-mime-types' {
	const apacheMimeTypes: Record<string, string>;
	export default apacheMimeTypes;
}
