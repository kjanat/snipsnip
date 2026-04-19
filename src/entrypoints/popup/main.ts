import { bootPopupRuntime } from '../../lib/popup/bootstrap.ts';

bootPopupRuntime().catch((error) => {
	console.error('Failed to bootstrap popup runtime:', error);
});
