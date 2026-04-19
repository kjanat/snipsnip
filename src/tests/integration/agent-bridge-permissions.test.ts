import { describe, expect, test } from 'bun:test';

import { buildExpectedManifest } from '@/tests/helpers/manifest.ts';

describe('Agent Bridge manifest permissions', () => {
	test('nativeMessaging is requested optionally instead of at install time', async () => {
		const manifest = await buildExpectedManifest('chrome');
		const permissions = (manifest.permissions ?? []) as readonly string[];
		const optional = (manifest.optional_permissions ?? []) as readonly string[];
		expect(permissions).not.toContain('nativeMessaging');
		expect(optional).toContain('nativeMessaging');
	});
});
