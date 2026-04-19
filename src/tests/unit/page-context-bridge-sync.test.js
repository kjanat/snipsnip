const fs = require('fs');
const path = require('path');

describe('page context bridge asset sync', () => {
	test('public page bridge matches source bridge', () => {
		const sourcePath = path.join(__dirname, '../../contentScript/pageContext.js');
		const publicPath = path.join(__dirname, '../../../public/contentScript/pageContext.js');

		const sourceContent = fs.readFileSync(sourcePath, 'utf8');
		const publicContent = fs.readFileSync(publicPath, 'utf8');

		expect(publicContent).toBe(sourceContent);
	});
});
