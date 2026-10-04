/*
 * Runs every guard and reports one verdict.
 *
 * Three things this does that running the files by hand does not:
 *
 *   1. It refuses to report a pass for a guard that is not there. A PowerShell loop
 *      over a list of guard files once reported `failures=0` for two files that did
 *      not exist, because the loop counted results rather than checking that it had
 *      any. Every guard is `existsSync`-checked here before it runs, and a missing one
 *      is a failure.
 *   2. It keeps going after a failure, so one broken guard does not hide the state of
 *      the other two. The exit code is the only thing that is fail-fast.
 *   3. It says what it cannot check. These guards read the built output and the
 *      compiled CSS. They cannot see a rendered page, so anything that needs a browser
 *      is measured by hand and recorded in the README, not asserted here.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const GUARDS = [
	{
		script: 'responsive.mjs',
		reads: 'compiled CSS',
		checks: 'conditional rules can win, container queries, grid floors, width floors, touch target heights'
	},
	{ script: 'nav.mjs', reads: 'built HTML', checks: 'link graph, heading structure, anchors, images, page metadata' },
	{ script: 'copy.mjs', reads: 'built HTML and docs source', checks: 'dashes, buzzwords, unopenable references, sample identifiers' },
	{ script: 'buntool.mjs', reads: 'package.json', checks: 'the bun script shape, so the 70s trap cannot come back' }
];

if (!existsSync(join(process.cwd(), 'build'))) {
	console.error('No build/ directory. Run "bun run build" before "bun run verify".');
	process.exit(1);
}

const results = [];
let missing = 0;

for (const guard of GUARDS) {
	const path = join(process.cwd(), 'scripts', 'verify', guard.script);

	if (!existsSync(path)) {
		missing += 1;
		results.push({ ...guard, code: null, summary: 'GUARD FILE NOT FOUND', tail: '' });
		continue;
	}

	let code = 0;
	let output = '';
	try {
		output = execFileSync(process.execPath, [path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	} catch (e) {
		code = e.status ?? 1;
		output = `${e.stdout || ''}${e.stderr || ''}`;
	}

	const summaryLine = output.split('\n').filter((l) => l.includes('checks passed')).pop() || '(no summary)';
	results.push({
		...guard,
		code,
		summary: summaryLine.trim(),
		tail: code === 0 ? '' : output.trimEnd(),
		output
	});
}

console.log('\nverifying the built site\n');

for (const result of results) {
	if (result.code === null) {
		console.log(`  MISSING ${result.script}`);
		console.log(`          ${result.summary}`);
		continue;
	}
	const mark = result.code === 0 ? 'pass' : 'FAIL';
	console.log(`  ${mark}  ${result.script}`);
	console.log(`        ${result.summary}`);
	console.log(`        reads ${result.reads}: ${result.checks}`);
	if (result.tail) {
		console.log('');
		for (const line of result.tail.split('\n')) console.log(`        ${line}`);
	}
}

const failed = results.filter((r) => r.code !== 0).length;
const passed = results.filter((r) => r.code === 0).length;

console.log(
	`\n${passed} of ${results.length} guards passed${failed || missing ? `, ${failed} failed${missing ? `, ${missing} missing` : ''}` : ''}`
);

console.log(
	'\nnot covered here: anything that needs a rendered page. The phone and tablet layouts were\n' +
		'measured in a browser at 360, 390, 414 and 768px across all ten pages, and those numbers\n' +
		'are recorded in the README. Re-measure after any layout change.'
);

process.exit(failed + missing === 0 ? 0 : 1);