import { defineConfig, devices } from '@playwright/test';

// Pinned so the base URL below and the preview server always agree.
const port = 4173;

export default defineConfig({
	testDir: 'tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	reporter: 'list',
	use: {
		baseURL: `http://localhost:${port}`
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		// The suite tests the shipped artefact, so it builds first and serves
		// the static output rather than running the dev server. A stale
		// server is never reused for the same reason.
		command: `npm run build && npm run preview -- --port ${port} --strictPort`,
		url: `http://localhost:${port}`,
		reuseExistingServer: false
	}
});
