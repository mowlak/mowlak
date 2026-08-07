import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
// Vitest re-exports Vite's own defineConfig with the test block typed, so
// one config file can describe both the build and the unit test run.
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),

			serviceWorker: {
				// The worker will be registered by the app layout with scope
				// /app/, so it serves the app and never the landing pages.
				// The framework's own registration knows no scope.
				register: false
			}
		})
	],

	test: {
		// Unit tests only. The browser tests under tests/ belong to
		// Playwright, which drives the built site instead.
		include: ['src/**/*.test.ts']
	}
});
