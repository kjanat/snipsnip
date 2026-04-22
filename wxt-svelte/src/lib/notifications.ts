import { settingsItem } from './storage';

const ICON = browser.runtime.getURL('/icon/128.png');

async function notify(title: string, message: string): Promise<void> {
	const settings = await settingsItem.getValue();
	if (!settings.notificationsEnabled) return;
	if (!browser.notifications) return;
	await browser.notifications.create({
		type: 'basic',
		iconUrl: ICON,
		title,
		message,
	});
}

export function notifyClipSaved(filename: string): Promise<void> {
	return notify('Clip saved', filename);
}

export function notifyClipFailed(reason: string): Promise<void> {
	return notify('Clip failed', reason);
}

export function notifyAgentBridgeStatus(connected: boolean): Promise<void> {
	return notify(
		'Agent Bridge',
		connected ? 'Native host connected.' : 'Native host disconnected.',
	);
}
