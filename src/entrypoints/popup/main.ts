import { bootPopupRuntime } from '@/lib/popup/bootstrap.ts';

bootPopupRuntime().catch((error: unknown) => {
	console.error('Failed to bootstrap popup runtime:', error);
});
