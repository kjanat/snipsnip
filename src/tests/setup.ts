import { afterEach, mock } from 'bun:test';
import './mocks/browser-api';
/**
 * Test setup file.
 * Runs before each test file to set up the testing environment.
 */

// Polyfills for Node.js environment
import { TextDecoder, TextEncoder } from 'node:util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock browser/chrome APIs globally
global.browser = require('./mocks/browser-api.ts');
global.chrome = global.browser; // Chrome uses 'chrome' instead of 'browser'

// Mock DOMParser if not available
if (typeof DOMParser === 'undefined' && typeof window !== 'undefined') {
	global.DOMParser = window.DOMParser;
}

// Mock console methods to reduce noise during tests (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: mock(),
//   debug: mock(),
//   info: mock(),
//   warn: mock(),
//   error: mock(),
// };

// Set up fetch mock if needed
global.fetch = mock();

// Clean up after each test
afterEach(() => {
	mock.clearAllMocks();
});
