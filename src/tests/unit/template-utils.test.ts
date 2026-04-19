import { afterEach, describe, expect, test } from 'bun:test';

import templateUtilsModule, { textReplace } from '@/shared/template-utils';

describe('Template utils helpers', () => {
	const createMomentStub = () => (value: Date | number | string | null = new Date()) => ({
		format(pattern: string) {
			if (pattern === 'YYYY-MM-DD') {
				const nextDate = value instanceof Date ? value : new Date(value ?? Date.now());
				const year = nextDate.getFullYear();
				const month = String(nextDate.getMonth() + 1).padStart(2, '0');
				const day = String(nextDate.getDate()).padStart(2, '0');
				return `${year}-${month}-${day}`;
			}

			return new Date(value).toISOString();
		},
	});

	describe('generateValidFileName', () => {
		const { generateValidFileName } = templateUtilsModule;

		test('removes custom disallowed regex characters when provided', () => {
			const raw = 'Archived [Notes] (2026)';
			const cleaned = generateValidFileName(raw, '[]()');

			expect(cleaned).toBe('Archived Notes 2026');
			expect(cleaned).not.toContain('[');
			expect(cleaned).not.toContain(']');
			expect(cleaned).not.toContain('(');
			expect(cleaned).not.toContain(')');
		});

		test('escapes regex metacharacters inside disallowedChars', () => {
			const raw = 'Funky *file* name';
			const cleaned = generateValidFileName(raw, '*');

			expect(cleaned).toBe('Funky file name');
		});
	});

	describe('formatDate fallback', () => {
		const originalMoment = global.moment;
		const actualMoment = createMomentStub();

		afterEach(() => {
			global.moment = originalMoment;
		});

		test('falls back to ISO date when moment cannot be loaded', () => {
			delete global.moment;

			const result = textReplace('Date: {date:YYYY-MM-DD}', {});

			expect(result).toMatch(/^Date: \d{4}-\d{2}-\d{2}$/);
		});

		test('uses moment when available on globalThis', () => {
			global.moment = actualMoment;

			const result = textReplace('Date: {date:YYYY-MM-DD}', {});

			expect(result).toMatch(/^Date: \d{4}-\d{2}-\d{2}$/);
		});
	});
});
