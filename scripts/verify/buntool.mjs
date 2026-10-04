/*
 * The bun scripts have to keep going through `bun x`.
 *
 * This is a guard about a measurement, and measurements rot. The claim in the README
 * is that `bun run <script>` runs a compound script on bun's own runtime, ignoring the
 * shebang, and that `svelte-check` on bun's runtime measured 70.1s against 12.2s on
 * node. Written the obvious way, `svelte-kit sync && svelte-check`, the command still
 * works and nothing looks broken. It just takes a minute, every time, silently.
 *
 * The 30 second timing ceiling from the original guard is not here, because a guard
 * that runs `check` takes twelve seconds and this file is meant to be cheap enough to
 * run on every save. The timing is recorded in the README instead, and this file
 * guards the thing that makes it possible to regress: the script text.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};

let checks = 0;
let failures = 0;

function check(label, condition, detail) {
	checks += 1;
	if (condition) {
		if (process.env.VERBOSE) console.log(`  ok   ${label}`);
		return true;
	}
	failures += 1;
	console.log(`  FAIL ${label}`);
	if (detail) console.log(`       ${detail}`);
	return false;
}

console.log('\n1. Compound scripts resolve their binaries with `bun x`');

for (const name of ['check', 'check:watch']) {
	const script = scripts[name];
	if (script === undefined) {
		check(`${name} exists`, false, 'not defined in package.json');
		continue;
	}
	// Split on the shell operator and look at each command.
	const commands = String(script).split('&&').map((c) => c.trim()).filter(Boolean);
	const bare = commands.filter((c) => !/^bun x /.test(c) && !/^bun run /.test(c));
	check(
		`${name} uses "bun x" for every binary it calls`,
		bare.length === 0,
		bare.length ? `these run on bun's runtime, not node's: ${bare.join(' | ')}` : undefined
	);
}

console.log('\n2. bun is declared as the package manager');

check('packageManager pins a bun version', /^bun@\d+\.\d+\.\d+$/.test(String(pkg.packageManager ?? '')), String(pkg.packageManager));

console.log('\n3. The lockfile is bun\'s');

const { existsSync, readdirSync } = await import('node:fs');
const root = readdirSync(process.cwd());
check('bun.lock is present', root.includes('bun.lock'), 'bun.lock is missing');
check(
	'no npm lockfile is committed',
	!root.includes('package-lock.json'),
	'package-lock.json exists, so two lockfiles now disagree'
);

console.log(
	`\nbuntool.mjs: ${checks - failures} of ${checks} checks passed${failures.length ? `, ${failures} FAILED` : ''}`
);
void existsSync;
process.exit(failures === 0 ? 0 : 1);