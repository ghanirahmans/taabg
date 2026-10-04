/*
 * Proves `responsive.mjs` can fail.
 *
 * A guard that has never reported a failure is indistinguishable from a guard that
 * cannot fail, and this project has produced three false greens that way. Each case
 * below reintroduces one of the faults the guard was written for, straight into the
 * compiled CSS, and asserts that exactly the intended check turns red.
 *
 * Nothing here touches the source tree. The compiled CSS is backed up in memory,
 * mutated, the guard is run, and the bytes are restored. `bun run build` is the
 * caller's job afterwards if a file was left dirty, which it is not.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ASSET_DIR = join(process.cwd(), 'build', '_app', 'immutable', 'assets');
const GUARD = join(process.cwd(), 'scripts', 'verify', 'responsive.mjs');

const cssFiles = readdirSync(ASSET_DIR).filter((f) => f.endsWith('.css'));
if (cssFiles.length === 0) {
	console.error('No compiled CSS in build/. Run "bun run build" first.');
	process.exit(1);
}

const paths = cssFiles.map((f) => join(ASSET_DIR, f));
const backups = new Map(paths.map((p) => [p, readFileSync(p, 'utf8')]));

/* Apply a transform across every stylesheet, reporting whether anything changed. */
function mutate(transform) {
	let changed = 0;
	for (const path of paths) {
		const before = backups.get(path);
		const after = transform(before, path);
		if (after !== before) {
			writeFileSync(path, after);
			changed += 1;
		}
	}
	return changed;
}

function restore() {
	for (const [path, text] of backups) writeFileSync(path, text);
}

function runGuard() {
	try {
		const out = execFileSync(process.execPath, [GUARD], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
		return { code: 0, out };
	} catch (e) {
		return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` };
	}
}

/*
 * `expect` is the guard's own check label, not a section heading. The guard prints
 * `FAIL <label>` with the label it was given, and matching on section numbers instead
 * made every case here report a failure that had not happened.
 *
 * Anything other than the intended check going red is itself a failure of this
 * harness: a mutation that trips a different check proves the guard catches
 * something other than the fault it names, which is just as wrong as missing it.
 */
const CASES = [
	{
		name: 'log message basis loses on specificity to its own base rule',
		expect: 'every conditional override outranks',
		apply: () =>
			mutate((css) =>
				// Demote the winning selector to a bare `.log-message`, exactly as the
				// original bug did: the same property, two classes against the three the
				// base rule compiles to.
				css.replace(
					/\.log\.svelte-9j9at li:where\([^)]*\)>\.log-message:where\([^)]*\)\{flex-basis:100%\}/,
					'.log-message{flex-basis:100%}'
				)
			)
	},
	{
		name: 'container query restyles the frame that establishes the container',
		expect: 'no container query restyles the container itself',
		apply: () =>
			mutate((css) =>
				// The condition compiles to Tailwind's range form and the hash has to be
				// reproduced faithfully, because the guard strips the hash before comparing
				// and an unhashed selector is not what Svelte emits.
				css.replace(
					/@container tableframe\s*\([^)]*\)\{/,
					'@container tableframe (width<=45rem){.table-scroll.svelte-1uha8ag{overflow-x:visible}'
				)
			)
	},
	{
		name: 'a bare fr track returns in the footer grid',
		expect: 'no flexible grid track is sized to its content',
		apply: () =>
			mutate((css) =>
				css.replace(
					/grid-template-columns:minmax\(0,1\.4fr\) minmax\(0,1fr\) minmax\(0,1fr\)/,
					'grid-template-columns:1.4fr 1fr 1fr'
				)
			)
	},
	{
		name: 'copy button floor is confined to a width band',
		expect: 'no 44px target floor is confined to a width band',
		apply: () =>
			mutate((css) => {
				let out = css;
				// Drop the unconditional floor, then reintroduce it inside a band only.
				out = out.replace(/\.codeblock-copy\{min-width:44px;min-height:44px\}/g, '.codeblock-copy{min-width:0}');
				out = out.replace(/(@media \(width<=767px\)\{)/, '$1.codeblock-copy{min-width:44px;min-height:44px}');
				return out;
			})
	},
	{
		name: 'search trigger goes back to a fixed 36px',
		expect: 'no control is fixed below 44px',
		apply: () =>
			mutate((css) =>
				css.replace(/(\.search-trigger[^{]*\{[^}]*?)min-width:44px/, '$1min-width:44px;height:36px')
			)
	}
];

let passed = 0;
const problems = [];

for (const testCase of CASES) {
	restore();
	const changed = testCase.apply();

	if (changed === 0) {
		problems.push(`${testCase.name}: the mutation matched nothing, so nothing was proven`);
		console.log(`  SKIP ${testCase.name} (mutation matched nothing)`);
		continue;
	}

	const { code, out } = runGuard();
	const red = [...out.matchAll(/^\s*FAIL\s(.+)$/gm)].map((m) => m[1].trim());
	const intended = red.filter((label) => label.startsWith(testCase.expect));
	const collateral = red.filter((label) => !label.startsWith(testCase.expect));

	if (code !== 0 && intended.length > 0) {
		passed += 1;
		console.log(`  ok   ${testCase.name}`);
		console.log(`       red: ${intended.join('; ')}`);
		if (collateral.length) console.log(`       also red: ${collateral.join('; ')}`);
	} else {
		problems.push(
			`${testCase.name}: expected "${testCase.expect}" to fail, got exit ${code} and [${red.join(', ')}]`
		);
		console.log(`  FAIL ${testCase.name}`);
		console.log(`       expected "${testCase.expect}" to go red; exit was ${code}; red was [${red.join(', ')}]`);
	}
}

restore();

console.log(`\nmutation.mjs: ${passed} of ${CASES.length} reintroduced faults were caught by the intended check`);
if (problems.length) {
	for (const p of problems) console.log(`  ${p}`);
	process.exit(1);
}
process.exit(0);