import { describe, expect, test } from 'bun:test';

import agentBridgeState from '@/shared/agent-bridge-state';
import countUtils from '@/shared/count-utils';
import downloadTracker from '@/shared/download-tracker';
import libraryExport from '@/shared/library-export';
import libraryState from '@/shared/library-state';
import markdownOptions from '@/shared/markdown-options';
import notifications from '@/shared/notifications';
import obsidianUtils from '@/shared/obsidian-utils';
import optionsState from '@/shared/options-state';
import popupBatchUtils from '@/shared/popup-batch-utils';
import searchCore from '@/shared/search-core';
import siteRules from '@/shared/site-rules';
import templateUtils from '@/shared/template-utils';
import urlUtils from '@/shared/url-utils';

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

	test('template-utils exports canonical API', () => {
		expect(templateUtils.generateValidFileName('Clip [One]', '[]')).toBe('Clip One');
	});

	test('url-utils exports canonical API', () => {
		expect(urlUtils.getImageFilename('https://example.com/image.png', { title: 'Docs' }, false)).toBe('image.png');
	});

	test('library-export exports canonical API', () => {
		expect(libraryExport.createLibraryExportFiles([{ title: 'Doc', markdown: '# hi' }])[0]?.filename).toBe('Doc.md');
	});

	test('options-state exports canonical API', () => {
		expect(optionsState.buildExportFilename(new Date('2026-03-17T10:15:00Z'))).toBe('SnipSnip-export-2026-03-17.json');
	});

	test('library-state exports canonical API', () => {
		expect(libraryState.normalizeLibrarySettings().itemsToKeep).toBe(10);
	});

	test('agent-bridge-state exports canonical API', () => {
		expect(agentBridgeState.normalizeSettings({ enabled: true })).toEqual({ enabled: true });
	});

	test('markdown-options exports canonical API', () => {
		const options = markdownOptions.createEffectiveMarkdownOptions({ title: 'Doc' }, { imagePrefix: '{title}/assets' });
		expect(options.imagePrefix).toBe('Doc/assets');
	});
});
