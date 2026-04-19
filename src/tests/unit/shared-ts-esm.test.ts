import { describe, expect, test } from 'bun:test';

import countUtils from '../../shared/count-utils.ts';
import downloadTracker from '../../shared/download-tracker.ts';
import notifications from '../../shared/notifications.ts';
import obsidianUtils from '../../shared/obsidian-utils.ts';
import popupBatchUtils from '../../shared/popup-batch-utils.ts';
import searchCore from '../../shared/search-core.ts';
import siteRules from '../../shared/site-rules.ts';

describe('shared TS ESM modules', () => {
	test('count-utils exports canonical API', () => {
		expect(countUtils.getWordCount('hello world')).toBe(2);
	});

	test('search-core exports canonical API', () => {
		expect(searchCore.normalizeSearchText('DownloadImages')).toBe('download images');
	});

	test('site-rules exports canonical API', () => {
		expect(siteRules.matchesSiteRulePattern('example.com/*', 'https://example.com/page')).toBe(true);
	});

	test('popup-batch-utils exports canonical API', () => {
		expect(popupBatchUtils.normalizeUrl('example.com')).toBe('https://example.com/');
	});

	test('notifications exports canonical API', () => {
		const state = notifications.queueVersionUpdate(notifications.ensureNotificationState(), {
			currentVersion: '4.5.0',
		});
		expect(state.pendingNotifications[0]?.id).toBe('version-update:4.5.0');
	});

	test('obsidian-utils exports canonical API', () => {
		expect(obsidianUtils.getObsidianTransportOptions({ imageStyle: 'obsidian' }).imageStyle).toBe('markdown');
	});

	test('download-tracker exports canonical API', () => {
		const tracker = downloadTracker.createDownloadTracker();
		expect(tracker.getState().snipSnipDownloads.size).toBe(0);
	});
});
