import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/', 'playwright-report/', 'test-results/']
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	// Both prettier configs come last so formatting rules never fight the
	// formatter; the svelte one covers the template-specific rules.
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ['**/*.svelte'],
		rules: {
			// resolve() exists to prepend a base path, and it emits paths
			// relative to the current page. The site is served from the root
			// of its own origin with no base path, so the only thing the
			// rewrite would add is a dependence on the exact trailing slash
			// of the current URL. Root-absolute links stay correct whatever
			// the server does. Revisit if the site ever moves under a prefix.
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				// The Svelte parser hands <script lang="ts"> blocks to the
				// TypeScript parser; the extra extension lets it resolve
				// imports of other components.
				parser: ts.parser,
				extraFileExtensions: ['.svelte'],
				// The project has no svelte.config.js — the compiler options
				// live in vite.config.ts — so mirror the one setting the
				// parser cares about instead of loading a config file.
				svelteConfig: {
					compilerOptions: { runes: true }
				}
			}
		}
	}
);
