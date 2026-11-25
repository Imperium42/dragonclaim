// SPDX-License-Identifier: MPL-2.0
// Copyright (c) Imperium42®, LLC.
// ###############################################################
// eslint.config.js (ESLint flat config)
// Formatting is owned by Prettier (eslint-config-prettier disables conflicting rules);
// this config only carries correctness/style rules Prettier doesn't cover.
// ###############################################################
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
	{
		ignores: ["dist/**", "node_modules/**", "data/**", "logs/**"],
	},
	js.configs.recommended,
	tseslint.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		rules: {
			camelcase: ["error", { properties: "always" }],
			"handle-callback-err": "off",
			"max-nested-callbacks": ["error", { max: 4 }],
			"max-statements-per-line": ["error", { max: 2 }],
			"no-console": "off",
			"no-unused-vars": "off", // superseded by the TS-aware rule below
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					args: "after-used",
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-explicit-any": "error",
			"preserve-caught-error": "error",
			"no-empty-function": "warn",
			"no-unsafe-optional-chaining": "error",
			"no-shadow": ["error", { allow: ["err", "resolve", "reject"] }],
			"no-var": "error",
			"prefer-const": "error",
			"prefer-destructuring": [
				"error",
				{ array: false, object: true },
				{ enforceForRenamedProperties: false },
			],
			yoda: "error",
		},
	},
	{
		// Test files use mocha globals
		files: ["test/**/*.js"],
		languageOptions: { globals: { ...globals.mocha } },
	},
	prettierConfig,
);
