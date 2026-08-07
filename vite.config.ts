import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

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
	]
});
