// Deployment gate: refuse to build for production unless this commit's
// CI concluded green. CI marks each green main commit with a ref
// (refs/ci-green/<sha>, pushed by the workflow's last step); this gate
// polls for that ref over git's smart-HTTP protocol, which - unlike
// the REST API - is not rate-limited on the shared build IP pool.
// A commit whose CI failed never gets the ref, so the gate times out
// and the build fails: fail-closed by design.
import { execFileSync } from 'node:child_process';

const REPO_URL = 'https://github.com/mowlak/mowlak.git';
const sha = process.env.CF_PAGES_COMMIT_SHA;
const TIMEOUT_MS = 12 * 60 * 1000;
const POLL_MS = 20 * 1000;

if (!sha) {
	// Not a Pages build (local run): nothing to gate.
	console.log('ci-gate: no CF_PAGES_COMMIT_SHA - skipping (not a Pages build)');
	process.exit(0);
}

const started = Date.now();
for (;;) {
	let out = '';
	try {
		out = execFileSync('git', ['ls-remote', REPO_URL, `refs/ci-green/${sha}`], {
			encoding: 'utf8',
			timeout: 30_000
		});
	} catch {
		// transient network/remote failure - retry until the deadline
	}
	if (out.includes(`refs/ci-green/${sha}`)) {
		console.log(`ci-gate: ci-green ref present for ${sha}`);
		process.exit(0);
	}
	if (Date.now() - started > TIMEOUT_MS) {
		console.error(
			`ci-gate: no ci-green ref for ${sha} within ${TIMEOUT_MS / 60000} min - failing closed`
		);
		process.exit(1);
	}
	console.log('ci-gate: waiting for the ci-green ref...');
	await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
