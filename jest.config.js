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
	// Conservative CI regression floors from 2026-11-06 V8 baseline:
	// statements/lines 73.8%, branches 76.57%, functions 86.66%.
	// Raise floors as integration coverage improves; avoid artificial 100%.
	coverageThreshold: {
		global: { statements: 70, branches: 70, functions: 80, lines: 70 },
	},
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				tsconfig: 'tsconfig.test.json',
			},
		],
	},
};
