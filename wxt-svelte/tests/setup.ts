import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({
	url: 'https://example.test/',
	settings: { disableJavaScriptFileLoading: true },
});
