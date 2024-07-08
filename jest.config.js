/*
ky is distributed as ESM module and won't work properly with jest
https://github.com/jestjs/jest/issues/11439#issuecomment-846923676
*/
module.exports = {
	preset: 'ts-jest/presets/js-with-ts',
	testEnvironment: "node",
	moduleNameMapper: {
		"^ky$": "<rootDir>/node_modules/ky/distribution", // tell Jest to resolve ky's files from `distribution` folder. This will solve the error "Cannot find module 'ky'"
	},
	transformIgnorePatterns: [
		'<rootDir>/node_modules/?!ky/distribution' // tell `ts-jest` to transform all js files in `ky/distribution` folder because all ky's js files are ESM files
	],
	// stop after first failing test
	bail: true,
	// stop after 3 failed tests
	// bail: 3
};