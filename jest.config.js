module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['**/__tests__/**/*.test.ts'],
	moduleFileExtensions: ['ts', 'js'],
	setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
	detectOpenHandles: true,
	// Collect coverage across the *production* node and credential sources,
	// including files not touched by the unit suites. No artificial threshold
	// until the measured baseline and integration gaps have been reviewed.
	// V8 coverage avoids legacy Babel/Istanbul instrumentation whose test-exclude
	// dependency currently fails with the resolved glob API in CI.
	coverageProvider: 'v8',
	collectCoverageFrom: ['nodes/**/*.ts', 'credentials/**/*.ts', '!**/*.d.ts'],
	coverageDirectory: '<rootDir>/coverage',
	coverageReporters: ['text-summary', 'json-summary'],
	// Coverage floors are enforced by scripts/check-coverage.mjs.
	// Jest 29's built-in threshold reporter crashes with the current glob tree.
	// Keeping the gate separate preserves coverage regression protection.
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.test.json',
			},
		],
	},
};
