/*
 * Copy and content rules, read from the built HTML and the docs source.
 *
 * These used to be `tmp-verify/typo.mjs` and `tmp-verify/content.mjs`, deleted after
 * every run, which meant neither could be run twice without being rewritten. They are
 * here now.
 *
 * Two things this guard is careful about, both learned the hard way:
 *
 *   - It reads the whole built output, not just what is visible. The "repository wins"
 *     sentence survived in the serialised page payload after the rendered callout had
 *     been replaced, and a visible-text-only check reported it as fixed.
 *   - It collapses whitespace before any text search. Collapsing turns `[^\n]*` into
 *     `[^\s\S]*`, which matches almost anything, so the patterns here run against
 *     collapsed text and are written for collapsed text.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BUILD = join(process.cwd(), 'build');
const DOCS_SRC = join(process.cwd(), 'src', 'lib', 'docs');
const COMPONENTS = join(process.cwd(), 'src');

let failures = 0;
let checks = 0;

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

function section(title) {
	console.log(`\n${title}`);
}

if (!existsSync(BUILD) || !existsSync(DOCS_SRC)) {
	console.error('Run "bun run build" first: this reads build/ and src/lib/docs/.');
	process.exit(1);
}

/* ------------------------------------------------------------------ read inputs */

/** Every built HTML file, keyed by a label that says where it came from. */
function readBuiltHtml() {
	const out = [];
	const walkDir = (dir, prefix) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walkDir(path, prefix);
			else if (entry.name.endsWith('.html')) out.push({ label: prefix + entry.name, html: readFileSync(path, 'utf8') });
		}
	};
	walkDir(BUILD, '');
	return out;
}

/** Every docs markdown file. */
function readDocs() {
	return readdirSync(DOCS_SRC)
		.filter((f) => f.endsWith('.md'))
		.map((f) => ({ label: f, text: readFileSync(join(DOCS_SRC, f), 'utf8') }));
}

const built = readBuiltHtml();
const docs = readDocs();

/*
 * Visible text and serialised payload, kept apart on purpose.
 *
 * `visible` is what a reader sees. `everything` includes the SvelteKit data payload,
 * which is where a replaced sentence goes to survive. Both are searched, and each
 * finding says which one it came from, because "it is still in the payload" is a
 * different bug from "it is still on the page".
 */
const stripTags = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, ' ');
const surfaces = [];
for (const { label, html } of built) {
	const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '');
	surfaces.push({
		label: `${label} (rendered)`,
		text: stripTags(withoutScripts),
		raw: withoutScripts
	});
	/*
	 * The payload surface drops SvelteKit's own bootstrap block.
	 *
	 * It carries `version: "1791011930294"`, a build identifier that is on every page
	 * by construction. Leaving it in meant the ten digit check fired on all ten pages
	 * for a number nobody wrote, which is the definition of a guard crying wolf.
	 */
	const payload = html.replace(/__sveltekit_[A-Za-z0-9_]+\s*=\s*\{[\s\S]*?\};?/g, ' ');
	surfaces.push({ label: `${label} (payload)`, text: payload, raw: payload });
}
for (const { label, text } of docs) {
	surfaces.push({ label, text, raw: text });
}

/* Collapse runs of whitespace so a sentence broken across lines is one string. */
const flatten = (s) => s.replace(/\s+/g, ' ');

/* Search every surface and return every hit. Nothing is dropped here. */
function findAll(pattern) {
	const hits = [];
	for (const surface of surfaces) {
		const flat = flatten(surface.text);
		const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
		let m;
		while ((m = re.exec(flat)) !== null) {
			hits.push({ where: surface.label, match: m[0].trim().slice(0, 90) });
		}
	}
	return hits;
}

/*
 * Truncation happens here, at print time, and never before.
 *
 * The first version returned early from `findAll` once it had twelve hits, to keep the
 * output short. The docs already contain twelve ten digit sample numbers, so the
 * thirteenth hit, which was the injected `081234567890`, was silently discarded and
 * the check reported clean. A guard that drops findings once it has enough of them is
 * worse than no guard, because the number of findings is exactly what nobody expects
 * to grow.
 */
const MAX_SHOWN = 8;

const show = (hits) => {
	const shown = hits.slice(0, MAX_SHOWN);
	const rest = hits.length - shown.length;
	return (
		shown.map((h) => `${h.where}: "${h.match}"`).join('\n       ') +
		(rest > 0 ? `\n       ... and ${rest} more` : '')
	);
};

/* ==================================================== 1. no em dash, no en dash */

section('1. No em dash and no en dash in anything that ships');

{
	// Both characters and their HTML entities, because mdsvex output and hand written
	// components can carry either.
	const hits = findAll(/[\u2014\u2013]|&mdash;|&ndash;|&#8212;|&#8211;/);
	check(
		'no em dash or en dash',
		hits.length === 0,
		hits.length ? show(hits) : `${surfaces.length} surfaces scanned`
	);
}

/* ============================================================ 2. no buzzwords */

section('2. No buzzwords');

{
	// A closed list, matched on word boundaries. These are the words that make
	// documentation sound like a press release and say nothing a reader can check.
	const BANNED = [
		'seamless',
		'seamlessly',
		'robust',
		'powerful',
		'cutting-edge',
		'state-of-the-art',
		'game-changer',
		'revolutionary',
		'leverage',
		'leveraging',
		'harness',
		'unlock',
		'empower',
		'streamline',
		'frictionless',
		'best-in-class',
		'world-class',
		'next-generation',
		'bleeding-edge',
		'turnkey',
		'synergy',
		'holistic',
		'paradigm',
		'holistically'
	];

	const hits = [];
	for (const word of BANNED) {
		const found = findAll(new RegExp(`\\b${word}\\b`, 'i'));
		for (const f of found) hits.push({ ...f, match: `${word} ("${f.match}")` });
	}
	check(
		`none of the ${BANNED.length} banned words appear`,
		hits.length === 0,
		hits.length ? show(hits) : undefined
	);
}

/* ================================ 3. no reference the private repository requires */

section('3. Nothing points at something a reader cannot open');

{
	// The bot's repository is private, so a Go package path, an architecture record
	// number, or a reference to the repository's own instruction file is a dead end
	// printed in the middle of an explanation.
	const PATTERNS = [
		{ re: /\binternal\/[a-z]/, label: 'a Go internal package path' },
		{ re: /\bADR\s*0?\d{3,4}\b/, label: 'an architecture record number' },
		{ re: /\bAGENTS\.md\b/, label: 'the repository instruction file' },
		{ re: /\bcmd\/[a-z]/, label: 'a Go command directory' },
		{ re: /\bhttps?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+/, label: 'a repository URL' }
	];

	const hits = [];
	for (const { re, label } of PATTERNS) {
		for (const h of findAll(re)) hits.push({ ...h, match: `${label}: "${h.match}"` });
	}
	check(
		'no unopenable reference',
		hits.length === 0,
		hits.length ? show(hits) : `${PATTERNS.length} patterns across ${surfaces.length} surfaces`
	);
}

/* ================================== 4. the placeholder convention is the one used */

/*
 * The three documented sample shapes, and what makes each one a sample.
 *
 * A No Internet number is `1000000000` followed by two digits: the prefix is constant
 * and only the last two vary, so it cannot be a subscriber's line.
 *
 * An ODP code is `ODP-XXX-YY/NNN`. Both the shape and an instance of it are accepted,
 * because the vocabulary table publishes the shape and the prose uses the instance.
 *
 * A phone number is ten digits with a run of six or more identical digits. `0211111111`
 * is `021` plus eight ones. The rule is the run rather than the literal, because a rule
 * that accepts exactly one string accepts one string and catches nothing else.
 */
const isNoInternet = (s) => /^1000000000\d{2}$/.test(s);
const isOdp = (s) => /^ODP-XXX-YY(\/(N\d{2}|\d{3}))?$/.test(s);
const hasDigitRun = (s, minRun) => new RegExp(`(\\d)\\1{${minRun - 1},}`).test(s);
const isPhone = (s) => /^\d{10}$/.test(s) && hasDigitRun(s, 6);

section('4. Sample identifiers follow the documented convention');

{
	/*
	 * The checks are two-sided. The shapes must appear, so the convention is real and
	 * not a paragraph nobody obeys. And any identifier that is *not* one of these
	 * shapes is likely a real one and gets reported.
	 *
	 * The first version of this matched ten digits for a No Internet and rejected the
	 * documented twelve, so it counted zero samples and would have passed a page full
	 * of real customer numbers. It also read `ODP-XXX-YY/NNN`, the shape the table
	 * documents, as a violation because it only allowed the `/001` instance.
	 */
	const flatDocs = docs.map((d) => flatten(d.text)).join('\n');

	const noInternet = [...new Set(flatDocs.match(/\b\d{12}\b/g) || [])];
	const badNoInternet = noInternet.filter((n) => !isNoInternet(n));
	check(
		'every twelve digit sample is 1000000000NN',
		badNoInternet.length === 0,
		badNoInternet.length ? `unexpected: ${badNoInternet.join(', ')}` : `${noInternet.length} found`
	);

	const odp = [...new Set(flatDocs.match(/\bODP-[A-Za-z0-9-]+(?:\/N?\d+)?/g) || [])];
	const badOdp = odp.filter((o) => !isOdp(o));
	check(
		'every ODP sample is ODP-XXX-YY/NNN',
		badOdp.length === 0,
		badOdp.length ? `unexpected: ${badOdp.join(', ')}` : `${odp.length} found`
	);

	const phone = [...new Set(flatDocs.match(/\b0\d{9}\b/g) || [])];
	const badPhone = phone.filter((p) => !isPhone(p));
	check(
		'every ten digit sample is an obvious placeholder',
		badPhone.length === 0,
		badPhone.length ? `unexpected: ${badPhone.join(', ')}` : `${phone.length} found`
	);

	check(
		'all three conventions are actually used',
		noInternet.length > 0 && odp.length > 0 && phone.length > 0,
		`${noInternet.length} No Internet, ${odp.length} ODP, ${phone.length} phone`
	);

	// The convention has to be written down where a reader meets it, or a sample is
	// just an odd-looking number.
	const vocabulary = docs.find((d) => d.label === 'vocabulary.md');
	check(
		'the vocabulary page states all three shapes',
		Boolean(vocabulary) &&
			/1000000000/.test(vocabulary.text) &&
			/ODP-XXX/.test(vocabulary.text) &&
			/Phone/.test(vocabulary.text),
		'the table on the vocabulary page is missing one of the three'
	);
}

/* ======================================== 5. no numbers that look like real data */

section('5. No digit run that looks like a real identifier');

{
	/*
	 * A real No Internet number, an ODP code, a phone number or a task id would be a run
	 * of ten or more digits that is not one of the three documented sample shapes.
	 *
	 * Timestamps in log transcripts are deliberately not matched: `2026-09-24 03:12:07`
	 * is the shape the tool actually prints, and it is not a customer identifier.
	 */
	const real = findAll(/(?<![\w.:-])\d{10,}(?![\w.])/g).filter((hit) => {
		if (/\d{4}-\d{2}-\d{2}|\d{10}T\d{2}/.test(hit.match)) return false;
		const digits = hit.match.replace(/\D/g, '');
		return !isNoInternet(digits) && !isPhone(digits);
	});

	check(
		'no digit run outside the three documented shapes',
		real.length === 0,
		real.length ? show(real) : undefined
	);
}

/* ================================== 6. the rendered output is not missing its copy */

section('6. Every page has prose, not just a shell');

{
	const empty = built
		.filter(({ html }) => stripTags(html).replace(/\s+/g, ' ').trim().length < 400)
		.map(({ label }) => label);
	check(
		'no page renders as an empty shell',
		empty.length === 0,
		empty.length ? `under 400 characters of text: ${empty.join(', ')}` : `${built.length} pages`
	);
}

/* ---------------------------------------------------------------------- done */

console.log(`\ncopy.mjs: ${checks - failures} of ${checks} checks passed${failures.length ? `, ${failures} FAILED` : ''}`);
process.exit(failures === 0 ? 0 : 1);