import { describe, expect, test } from 'bun:test';

import {
	BACKGROUND_MESSAGE_TYPES,
	isBackgroundMessage,
	isBackgroundMessageType,
} from '@/lib/background/message-contracts';

describe('background message contracts', () => {
	test('tracks known background message types', () => {
		expect(BACKGROUND_MESSAGE_TYPES).toContain('clip');
		expect(BACKGROUND_MESSAGE_TYPES).toContain('export-library-items');
		expect(BACKGROUND_MESSAGE_TYPES).not.toContain('display.md');
	});

	test('validates message type values', () => {
		expect(isBackgroundMessageType('download')).toBe(true);
		expect(isBackgroundMessageType('nope')).toBe(false);
	});

	test('validates message objects', () => {
		expect(isBackgroundMessage({ type: 'cancel-batch' })).toBe(true);
		expect(isBackgroundMessage({ type: 'display.md' })).toBe(false);
		expect(isBackgroundMessage(null)).toBe(false);
	});
});
