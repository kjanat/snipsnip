import { bootPopupRuntime } from '@/lib/popup/bootstrap';

bootPopupRuntime().catch((error) => {
	console.error('Failed to bootstrap popup runtime:', error);
});
