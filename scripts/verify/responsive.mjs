/*
 * Responsive guards, written after the phone-width pass found four faults that every
 * existing check reported as green.
 *
 * These read the compiled CSS, not the source. Tailwind owns `@layer base` and
 * reorders it, Svelte rewrites selectors to `.thing.svelte-1abc23`, and the minifier
 * collapses declarations into shorthands. A source-shaped pattern matches none of
 * that, which is how a guard ends up asserting against rules that were implemented
 * correctly. Run `bun run build` first: this reads `build/`.
 *
 * Each check names the bug it exists to catch. A guard that cannot be traced to an
 * observed fault is a guess, and a guess in a guard is worse than no guard.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ASSET_DIR = join(process.cwd(), 'build', '_app', 'immutable', 'assets');

/* ------------------------------------------------------------------ CSS input */

function readCompiledCss() {
	let files;
	try {
		files = readdirSync(ASSET_DIR).filter((f) => f.endsWith('.css'));
	} catch {
		fail('no compiled CSS', `looked in ${ASSET_DIR}. Run "bun run build" first.`);
	}
	if (files.length === 0) {
		fail('no compiled CSS', `${ASSET_DIR} held no .css file.`);
	}
	return files.map((f) => readFileSync(join(ASSET_DIR, f), 'utf8')).join('\n');
}

const css = readCompiledCss();

/* ------------------------------------------------------------- CSS parsing */

/*
 * Flatten the stylesheet into rules, keeping the at-rule context each rule sits in.
 *
 * A nesting-aware walk rather than a regex, because a flat regex cannot tell a rule
 * inside `@media` from one outside it, and that distinction is the whole subject of
 * the first check.
 */
function parseRules(source) {
	const out = [];

	// Strip comments so a commented-out rule cannot be read as a live one.
	const clean = source.replace(/\/\*[\s\S]*?\*\//g, '');

	const walk = (text, context, start) => {
		let i = 0;
		while (i < text.length) {
			const brace = text.indexOf('{', i);
			if (brace === -1) return;

			const prelude = text.slice(i, brace).trim();

			// Find the matching close brace.
			let depth = 1;
			let j = brace + 1;
			while (j < text.length && depth > 0) {
				if (text[j] === '{') depth += 1;
				else if (text[j] === '}') depth -= 1;
				j += 1;
			}
			const body = text.slice(brace + 1, j - 1);

			if (prelude.startsWith('@')) {
				if (body.includes('{')) {
					// A conditional group: descend, carrying the context.
					const name = prelude.split(/\s+/).slice(0, 2).join(' ');
					walk(body, [...context, name], 0);
				}
				// A declaration at-rule such as `@container name { ... }` never occurs
				// here; Svelte emits conditional groups, so nothing to do.
			} else if (prelude) {
				out.push({ selector: prelude, body, context: [...context] });
			}

			i = j;
		}
		void start;
	};

	walk(clean, [], 0);
	return out;
}

const rules = parseRules(css);

/* Split a rule body into declarations, dropping nested blocks. */
function declarations(body) {
	const flat = body.replace(/\{[\s\S]*?\}/g, '');
	const out = [];
	for (const chunk of flat.split(';')) {
		const idx = chunk.indexOf(':');
		if (idx === -1) continue;
		out.push({ property: chunk.slice(0, idx).trim(), value: chunk.slice(idx + 1).trim() });
	}
	return out;
}

/*
 * A selector list, split into branches, with Svelte's scope hash removed.
 *
 * The hash has to go before any comparison. Svelte compiles `.thing` to
 * `.thing.svelte-1abc23`, so comparing an authored selector against a compiled one
 * always mismatches. The first version of the container check hit exactly that: a rule
 * for `.table-scroll` inside a container query was compared against the
 * `.table-scroll.svelte-1uha8ag` that establishes the container, found no match, and
 * reported the one fault it exists to catch as clean.
 */
function stripScopeHash(selector) {
	return selector.replace(/\.svelte-[A-Za-z0-9]+/g, '');
}

function branches(selector) {
	return stripScopeHash(selector)
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
}

/*
 * Specificity of a whole selector branch, as [ids, classes, elements].
 *
 * Over the whole branch, not over the last compound. The last version scored only
 * `.log-message`, which made `.log li > .log-message` and `.log-message` tie at one
 * class, and the log bug is precisely that those two are not the same weight. The
 * base rule scores three and the media rule one, and the media rule loses.
 *
 * `:where()` contributes nothing, which is what makes the bug possible in the first
 * place: it was added to carry the scope hash without raising specificity, and the
 * ancestor chain it sits behind is what carries the weight.
 */
function specificity(branch) {
	const clean = branch.replace(/:where\([^)]*\)/g, '');
	const ids = (clean.match(/#[\w-]+/g) || []).length;
	const attrs = (clean.match(/\[[^\]]*\]/g) || []).length;
	const pseudoClasses = (clean.match(/:(?!:)[\w-]+(\([^)]*\))?/g) || []).filter(
		(p) => !/^:(before|after|first-line|first-letter|selection|placeholder)$/.test(p)
	).length;
	const classes = (clean.match(/\.[\w-]+/g) || []).length;
	// Element names are the tokens left once classes, attributes and pseudo-classes
	// are removed. Counting them properly matters: `li` and `div` are real weight.
	const withoutClasses = clean
		.replace(/\.[\w-]+/g, ' ')
		.replace(/\[[^\]]*\]/g, ' ')
		.replace(/:(?!:)[\w-]+(\([^)]*\))?/g, ' ');
	const elements = (withoutClasses.match(/(^|[\s>+~,])([a-zA-Z][\w-]*)/g) || []).length;
	return [ids, classes + attrs + pseudoClasses, elements];
}

function compareSpecificity(a, b) {
	for (let i = 0; i < 3; i += 1) {
		if (a[i] !== b[i]) return a[i] - b[i];
	}
	return 0;
}

/* Two declarations that render identically must not be treated as conflicting. */
function normaliseValue(value) {
	return String(value).replace(/\s+/g, '').replace(/;$/, '').toLowerCase();
}

/*
 * The element a branch's last compound names, used to line rules up.
 *
 * A branch never reduces to an empty string. Stripping pseudo-classes off
 * `tr:last-child > :last-child` leaves nothing behind, and an empty branch then made
 * `every()` vacuously true, so a rule about a table row read as a rule about the
 * frame. The unstripped compound is kept instead, and a subject that is only a
 * pseudo-class can never name a container element.
 */
function subjectOf(selector) {
	return branches(selector).map((branch) => {
		const compounds = branch.split(/\s*>\s*|\s+|~/).filter(Boolean);
		const last = compounds[compounds.length - 1] || branch;
		const stripped = last
			.replace(/:where\([^)]*\)/g, '')
			.replace(/:(?!:)[^\s]+(\([^)]*\))?/g, '')
			.trim();
		return stripped.length > 0 ? stripped : last;
	});
}

/* A shorthand resets the longhands it contains. This is the bug, not a detail. */
const SHORTHAND_LONGHANDS = {
	flex: ['flex-grow', 'flex-shrink', 'flex-basis'],
	'flex-flow': ['flex-wrap', 'flex-direction'],
	margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
	padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
	'inset-block': ['top', 'bottom'],
	inset: ['top', 'right', 'bottom', 'left'],
	border: ['border-top', 'border-right', 'border-bottom', 'border-left'],
	overflow: ['overflow-x', 'overflow-y'],
	font: ['font-size', 'font-weight', 'line-height', 'font-family'],
	container: ['container-type', 'container-name', 'container'],
	place: ['place-items'],
	'place-items': ['align-items', 'justify-items'],
	'place-content': ['align-content', 'justify-content'],
	gap: ['row-gap', 'column-gap']
};

/*
 * The four-box shorthands can be resolved to longhand values. Everything else cannot.
 *
 * `padding: 1.5rem 0` means 1.5rem top and bottom, 0 left and right, and knowing that
 * is what lets the same-value test in check 1 work. Without it the guard saw the
 * shorthand `padding` set `padding-right` to the text `1.5rem 0`, compared that against
 * a rival's `padding-right: 0`, decided they conflicted, and reported the rule as a
 * loss. It is a loss, but of a declaration that changes nothing visible, because both
 * sides end up at 0 for that side.
 *
 * `flex: 1 1 0` is not in this list. Resolving it means parsing the component order and
 * the unit of each part, which is more machinery than this check is worth, so a `flex`
 * override is compared as a whole and treated as conflicting whenever it is outranked.
 */
const FOUR_BOX_LONGHANDS = {
	padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
	margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
	inset: ['top', 'right', 'bottom', 'left'],
	'border-width': ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
	'scroll-padding': ['scroll-padding-top', 'scroll-padding-right', 'scroll-padding-bottom', 'scroll-padding-left'],
	'scroll-margin': ['scroll-margin-top', 'scroll-margin-right', 'scroll-margin-bottom', 'scroll-margin-left']
};

/* Resolve one declaration into `[longhand, value]` pairs. */
function resolveDeclaration(property, value) {
	const trimmed = value.trim();
	const box = FOUR_BOX_LONGHANDS[property];
	if (!box) {
		const longhands = SHORTHAND_LONGHANDS[property];
		if (!longhands) return [[property, trimmed, true]];
		// Not resolvable to a value: `flex: 1 1 0` says nothing about `flex-basis`
		// without parsing the component order and the unit of each part.
		return longhands.map((l) => [l, trimmed, false]);
	}

	const parts = trimmed.split(/\s+/);
	let values;
	switch (parts.length) {
		case 1:
			values = [parts[0], parts[0], parts[0], parts[0]];
			break;
		case 2:
			values = [parts[0], parts[1], parts[0], parts[1]];
			break;
		case 3:
			values = [parts[0], parts[1], parts[2], parts[1]];
			break;
		default:
			values = [parts[0], parts[1], parts[2], parts[3]];
	}
	return box.map((longhand, i) => [longhand, values[i], true]);
}

/* ---------------------------------------------------------------- reporting */

const failures = [];
let checks = 0;

function pass(label, detail) {
	checks += 1;
	if (process.env.VERBOSE) console.log(`  ok   ${label}${detail ? ` (${detail})` : ''}`);
}

function check(label, condition, detail) {
	checks += 1;
	if (condition) {
		if (process.env.VERBOSE) console.log(`  ok   ${label}`);
		return true;
	}
	failures.push({ label, detail });
	console.log(`  FAIL ${label}`);
	if (detail) console.log(`       ${detail}`);
	return false;
}

function fail(label, detail) {
	failures.push({ label, detail });
	console.log(`  FAIL ${label}`);
	if (detail) console.log(`       ${detail}`);
}

function section(title) {
	console.log(`\n${title}`);
}

/* =================================================================== CHECK 1 */

/*
 * A rule inside `@media` cannot lose to an unconditional rule on specificity.
 *
 * The bug: the log band gives `.log-message` a `flex: 1 1 0` in its base rule, which
 * compiles to `.log li > .log-message:where(.svelte-x)`, three classes. The
 * `@media (width<=640px)` rule that was supposed to widen it said
 * `.log-message:where(.svelte-x)`, two classes. The media query matched, measured
 * `true` at every phone width, and the computed `flex-basis` stayed `0px`, because
 * three classes beats two no matter how much later the rule is. The message was left
 * sharing a line with four fixed fields and measured 4px wide at a 414px viewport.
 */
section('1. A conditional rule has to be able to win');

{
	/*
	 * Index every unconditional declaration by property, then by subject element.
	 *
	 * Keyed by subject so two rules line up only when they style the same element, and
	 * the strength recorded is the strongest branch, because a selector list applies
	 * whichever branch wins. The log base rule ships as
	 * `.log-message, .log li > .log-message:where(...)`, and the second branch is the
	 * one that outranks the media query.
	 */
	const unconditional = new Map(); // `${property}|${subject}` -> [{ selector, specificity }]
	for (const rule of rules) {
		if (rule.context.length > 0) continue;
		const list = branches(rule.selector);
		const subjects = subjectOf(rule.selector);

		for (const decl of declarations(rule.body)) {
			for (const [prop, value, resolvable] of resolveDeclaration(decl.property, decl.value)) {
				for (let i = 0; i < subjects.length; i += 1) {
					const key = `${prop}|${subjects[i]}`;
					/*
					 * `resolvable` says whether `value` is the value this longhand actually
					 * takes. Four-box shorthands are resolved above, so `padding: 1.5rem 0`
					 * is known to set `padding-right` to `0`. `flex: 1 1 0` is not, so a
					 * `flex` override is treated as conflicting whenever it is outranked.
					 */
					const entry = {
						selector: list[i],
						specificity: specificity(list[i]),
						value,
						resolvable
					};
					if (!unconditional.has(key)) unconditional.set(key, []);
					unconditional.get(key).push(entry);
				}
			}
		}
	}

	let checked = 0;
	const shortfalls = [];

	for (const rule of rules) {
		const conditional = rule.context.filter((c) => c.startsWith('@media') || c.startsWith('@container'));
		if (conditional.length === 0) continue;

		const list = branches(rule.selector);
		const subjects = subjectOf(rule.selector);

		for (const decl of declarations(rule.body)) {
			for (const [prop, value, resolvable] of resolveDeclaration(decl.property, decl.value)) {
				for (let i = 0; i < subjects.length; i += 1) {
					const rivals = unconditional.get(`${prop}|${subjects[i]}`) || [];
					if (rivals.length === 0) continue;
					checked += 1;
					const mine = specificity(list[i]);

					/*
					 * A rival that writes the same value is not a rival.
					 *
					 * The first version flagged `.figure { border-right: 0 }` inside a width
					 * band as losing to `.figure:last-child { border-right: 0 }`. Both say the
					 * same thing, so the loss changes nothing that can be seen, and a guard
					 * that reports no-op losses trains its reader to ignore it. Only a rival
					 * with a *different* value can change the rendering.
					 *
					 * The test needs both values to be the real longhand value. Four-box
					 * shorthands resolve above; a `flex` shorthand does not, so a `flex`
					 * override stays in the conservative path and is reported when outranked.
					 */
					const comparable = resolvable && rivals.every((r) => r.resolvable);
					const conflicting = comparable
						? rivals.filter((r) => normaliseValue(r.value) !== normaliseValue(value))
						: rivals;
					if (conflicting.length === 0) continue;

					const strongest = conflicting.reduce(
						(best, r) => (compareSpecificity(r.specificity, best.specificity) > 0 ? r : best),
						conflicting[0]
					);
					if (compareSpecificity(mine, strongest.specificity) < 0) {
						shortfalls.push(
							`${prop} on "${subjects[i]}": conditional rule "${list[i]}" is ${mine.join(',')}, ` +
								`but "${strongest.selector}" is ${strongest.specificity.join(',')} and says ` +
								`"${strongest.value}". Later in the file does not help.`
						);
					}
				}
			}
		}
	}

	check(
		'every conditional override outranks the rule it overrides',
		shortfalls.length === 0,
		shortfalls.length ? [...new Set(shortfalls)].join('\n       ') : `${checked} comparisons, none lost`
	);
}

/* =================================================================== CHECK 2 */

/*
 * An `@container` block must not style the element that establishes the container.
 *
 * The bug: while moving the card mode off a viewport query and onto a container
 * query, the block still carried `.table-scroll { overflow-x: visible }`. An element
 * cannot query itself, so that rule resolves against an ancestor, and no ancestor was
 * a container. It would have compiled cleanly, passed every static check, and left
 * the frame's own scroll behaviour untouched. Caught by reading the rule, not by
 * rendering it.
 */
section('2. A container query cannot reach its own container');

{
	const establishers = rules
		.filter((r) => {
			const props = declarations(r.body).map((d) => d.property);
			return props.includes('container-type') || props.includes('container-name') || props.includes('container');
		})
		.map((r) => ({ selector: stripScopeHash(r.selector), subjects: subjectOf(r.selector) }));

	check(
		'at least one container is established',
		establishers.length > 0,
		establishers.length ? `${establishers.length} found` : 'found none, so check 2 cannot fail'
	);

	const offenders = [];
	for (const rule of rules) {
		const containerQuery = rule.context.find((c) => c.startsWith('@container'));
		if (!containerQuery) continue;
		const names = containerQuery.replace('@container', '').trim().split(/[\s(]+/)[0];

		// The subject is the element the rule actually styles, the rightmost compound
		// of each selector in the list. A descendant selector such as
		// `.table-scroll .data` resolves against the container correctly, because its
		// subject is inside the container. Only a rule whose subject *is* the container
		// is unreachable, and a list is only unreachable if every branch is.
		const subjects = subjectOf(rule.selector);
		for (const est of establishers) {
			const estSubject = est.subjects[est.subjects.length - 1];
			if (!estSubject) continue;
			if (!subjects.every((s) => s === estSubject)) continue;
			offenders.push(
				`"${rule.selector}" is inside ${containerQuery}, and "${estSubject}" is the element ` +
					`that establishes ${names}. A rule cannot query its own container.`
			);
		}
	}

	check(
		'no container query restyles the container itself',
		offenders.length === 0,
		offenders.length ? [...new Set(offenders)].join('\n       ') : undefined
	);
}

/* =================================================================== CHECK 3 */

/*
 * A grid track has to have a floor of zero.
 *
 * The bug: `.snippet-pair` and `.split` declared `display: grid` and nothing else, so
 * the implicit track was `auto`, which sizes to max-content. The code frames inside
 * are wider than a phone, so the track measured 468px and 525px inside a 297px column
 * and pushed the whole landing page sideways. `scrollWidth` was 549 against a
 * `clientWidth` of 345, at every phone width.
 *
 * A bare `fr` is `minmax(auto, 1fr)`, so it carries the same min-content floor and is
 * flagged here too, even where nothing is wide enough to trigger it today.
 */
section('3. Every flexible grid track can shrink to zero');

{
	const offenders = [];
	let grids = 0;
	let tracks = 0;

	/*
	 * Expand `repeat(n, track)` so a track list can be walked. The compiled CSS is
	 * minified, so `repeat(3,minmax(0,1fr))` arrives with no space after the comma and
	 * a naive split on whitespace hands the whole repeat() back as one "track", which
	 * then looks like an unrecognised track.
	 */
	const expandTracks = (value) => {
		const out = [];
		let rest = value.trim();
		while (rest.length > 0) {
			const repeat = rest.match(/^repeat\(\s*(\d+)\s*,\s*(.+?)\s*\)$/);
			if (repeat) {
				for (let n = 0; n < parseInt(repeat[1], 10); n += 1) out.push(repeat[2]);
				return out;
			}
			if (rest.startsWith('minmax(')) {
				let depth = 1;
				let i = 'minmax('.length;
				while (i < rest.length && depth > 0) {
					if (rest[i] === '(') depth += 1;
					else if (rest[i] === ')') depth -= 1;
					i += 1;
				}
				out.push(rest.slice(0, i));
				rest = rest.slice(i).trim();
				continue;
			}
			const next = rest.search(/[\s]/);
			const token = next === -1 ? rest : rest.slice(0, next);
			out.push(token);
			rest = next === -1 ? '' : rest.slice(next).trim();
		}
		return out.filter(Boolean);
	};

	for (const rule of rules) {
		/*
		 * Every `grid-template-columns` declaration is judged, whether or not the same
		 * rule also declares `display: grid`.
		 *
		 * The first version required them together, which silently skipped every
		 * Tailwind grid utility, because Tailwind emits `display: grid` and
		 * `grid-template-columns` as two separate rules for two separate classes. The
		 * footer's own three-track grid was fixed by hand and then not covered by the
		 * check that was written to cover it. A declaration of `grid-template-columns`
		 * on an element makes it a grid, so requiring proof of that is not worth the
		 * blind spot.
		 */
		const template = declarations(rule.body).find((d) => d.property === 'grid-template-columns');
		if (!template) continue;
		grids += 1;

		for (const track of expandTracks(template.value)) {
			tracks += 1;
			// Only content-driven tracks are judged. A bare `fr` is `minmax(auto, 1fr)`
			// and `auto` is min-content, so both keep a floor. A fixed length is a
			// deliberate choice by the author, not a floor the content imposes.
			const isFlexible = /(^|[\s(,])((auto)|([\d.]*fr))$/.test(track) && !/^minmax\(\s*0/.test(track);
			if (isFlexible) {
				offenders.push(`"${rule.selector}" has track "${track}", which sizes to its content.`);
			}
		}
	}

	// A grid with no template has one implicit `auto` track. That is only a hazard when
	// something wide can land in it, which the CSS alone cannot say, so it is counted
	// rather than failed. Both grids that actually broke were given explicit templates.
	let implicit = 0;
	for (const rule of rules) {
		const decls = declarations(rule.body);
		if (decls.some((d) => d.property === 'grid-template-columns')) continue;
		if (decls.some((d) => d.property === 'display' && /(^|\s)(inline-)?grid(\s|$)/.test(d.value))) implicit += 1;
	}

	check(
		'no flexible grid track is sized to its content',
		offenders.length === 0,
		offenders.length
			? [...new Set(offenders)].join('\n       ')
			: `${tracks} tracks across ${grids} templates, ${implicit} implicit single-track grids not judged`
	);
}

/* =================================================================== CHECK 4 */

/*
 * A table's width floor has to be liftable by the same rule that removes the scroll.
 *
 * The bug: the portals table carried `min-width: 44rem`, which is 704px, inside a frame
 * that a card mode set to `overflow-x: visible`. A floor in a frame that cannot scroll
 * does not protect the table, it just pushes the table past its container, and the page
 * scrolls sideways. The same pair then drifted across two files: the scoped
 * `min-width: 44rem` in the component beat the global `min-width: 0` in the card mode
 * on specificity, and the tables scrolled by 409px on a 360px screen.
 *
 * Both tables are now floored by nothing at all, which is the durable answer: a table
 * that wraps cannot push anything anywhere. So the check is now the absence of floors,
 * plus the presence of a card mode that lifts them if one ever comes back.
 */
section('4. No table floor outlives the rule that lifts it');

{
	const floors = rules
		.map((r) => ({ selector: stripScopeHash(r.selector), decl: declarations(r.body).find((d) => d.property === 'min-width') }))
		.filter((x) => x.decl && /^[\d.]+(rem|em|ch|px)$/.test(x.decl.value.trim()));

	const tableFloors = floors.filter((f) => /table|\.data|prose/.test(f.selector));

	check(
		'no table carries a width floor',
		tableFloors.length === 0,
		tableFloors.length
			? [...new Set(tableFloors.map((f) => `"${f.selector}" min-width: ${f.decl.value}`))].join('\n       ')
			: `${floors.length} floors elsewhere, none on a table`
	);

	const scrollable = rules.filter((r) =>
		declarations(r.body).some((d) => d.property === 'overflow-x' && /auto|scroll/.test(d.value))
	);
	check(
		'a scrollable frame exists for table content that cannot compress',
		scrollable.length > 0,
		'no frame scrolls, so wide content has nowhere to go'
	);

	// If a floor is ever put back, the card mode has to lift it in the same place. Both
	// live in `app.css` now; the check is that they are still in the same block.
	const cardBlocks = rules.filter((r) => r.context.some((c) => c.startsWith('@container')));
	const liftsFloors = cardBlocks.some((r) => declarations(r.body).some((d) => d.property === 'min-width'));
	const removesScroll = cardBlocks.some((r) =>
		declarations(r.body).some((d) => d.property === 'overflow-x' && /visible/.test(d.value))
	);

	check(
		'the card mode does not remove the scroll while keeping a floor',
		!(removesScroll && tableFloors.length > 0 && !liftsFloors),
		removesScroll && tableFloors.length > 0 && !liftsFloors
			? 'overflow-x: visible with a floor the same block never lifts'
			: undefined
	);
}

/* =================================================================== CHECK 5 */

/*
 * Class names are matched as whole tokens, never as substrings.
 *
 * The first version of this matched `/tab/i` anywhere in a selector and flagged
 * `.table-scroll`, because "table" begins with "tab". A guard that cannot tell a data
 * table from a set of tabs is worse than no guard, because it teaches the reader to
 * ignore it.
 */
const CONTROL_TOKENS = new Set([
	'search-trigger',
	'menu-trigger',
	'codeblock-copy',
	'to-top',
	'footer-link',
	'disclosure',
	'tab',
	'tabs',
	'chip',
	'btn',
	'button',
	'close',
	'control'
]);

/* A visually hidden element is 1px on purpose and must not be judged as a control. */
const isVisuallyHidden = (selector) =>
	/sr-only|visually-hidden|thead|caption/.test(selector);

const classTokensOf = (selector) =>
	[...selector.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1].toLowerCase());

/*
 * A control that a thumb reaches is 44px at every width.
 *
 * The bug: the copy button and the transcript tabs carried `min-height: 44px` inside
 * `@media (max-width: 767px)`, so a tablet in portrait, which is 768px wide, got
 * 26px and 36px. A tablet in portrait is exactly as much a thumb device as a phone,
 * and the width band was an accident of when the rule was written.
 *
 * Declared heights are read from the compiled CSS. A `(pointer: coarse)` rule counts,
 * because that is the honest way to express "this is only a thumb target".
 */
section('5. Declared control heights are 44px or covered by a coarse-pointer rule');

{
	const MIN = 44;
	const offenders = [];
	let controls = 0;

	for (const rule of rules) {
		const decls = declarations(rule.body);
		const height = decls.find((d) => d.property === 'height' || d.property === 'min-height');
		if (!height) continue;

		const value = height.value.trim();
		if (!/^([\d.]+)px$/.test(value)) continue; // rem, calc, clamp: not decidable here
		if (rule.context.some((c) => c.includes('coarse') || c.includes('hover:none'))) continue;
		// A min-height under 44px is a floor, not a ceiling: content can exceed it.
		if (height.property === 'min-height') continue;
		if (isVisuallyHidden(rule.selector)) continue;

		const classTokens = classTokensOf(rule.selector);
		const isControl = classTokens.some((token) => CONTROL_TOKENS.has(token));
		if (!isControl) continue;

		const px = parseFloat(value);
		if (px >= MIN) continue;

		controls += 1;
		offenders.push(
			`"${rule.selector}" sets ${height.property}: ${value}, with no coarse-pointer rule and no ` +
				`(max-width: 767px) companion.`
		);
	}

	check(
		'no control is fixed below 44px without a narrow-width or coarse-pointer rule',
		offenders.length === 0,
		offenders.length ? [...new Set(offenders)].join('\n       ') : `${controls} control heights judged`
	);
}

/* =================================================================== CHECK 6 */

/*
 * A thumb-target floor must not live inside a width band.
 *
 * The bug: `.codeblock-copy` and `.tab` carried `min-height: 44px` inside
 * `@media (max-width: 767px)`. A tablet in portrait is 768px wide, so it fell one
 * pixel outside the band and got a 26px copy button and 36px tabs. The rule was
 * written when "phone" meant "below 768px" and nobody checked the width just above
 * it, which is a real device.
 *
 * A width band is the wrong tool for this. A phone is narrow, a thumb is not a
 * width. `@media (pointer: coarse)` is the honest condition, and a floor in an
 * unconditional base rule is right because it never contradicts a taller element.
 */
section('6. A thumb-target floor is unconditional or scoped to a pointer');

{
	const MIN = 44;
	const offenders = [];
	let floors = 0;

	const classTokensOf = (selector) =>
		[...selector.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1].toLowerCase());

	for (const rule of rules) {
		const decl = declarations(rule.body).find(
			(d) => d.property === 'min-height' && /^([\d.]+)px$/.test(d.value.trim()) && parseFloat(d.value) >= MIN
		);
		if (!decl) continue;

		const tokens = classTokensOf(rule.selector);
		if (!tokens.some((t) => CONTROL_TOKENS.has(t))) continue;
		if (isVisuallyHidden(rule.selector)) continue;

		floors += 1;

		const unconditional = rule.context.length === 0;
		const pointerScoped = rule.context.some((c) => /pointer\s*:\s*(coarse|any-pointer)|hover\s*:\s*none/.test(c));
		// A floor may be restated inside a width band, provided it also stands alone
		// somewhere. Anything narrower than a pointer is a guess about the device.
		const widthBand = rule.context.some((c) => c.startsWith('@media') && /width/.test(c));
		const restatedUnconditionally = rules.some(
			(r) =>
				r.context.length === 0 &&
				classTokensOf(r.selector).some((t) => tokens.includes(t)) &&
				declarations(r.body).some(
					(d) => d.property === 'min-height' && /^([\d.]+)px$/.test(d.value.trim()) && parseFloat(d.value) >= MIN
				)
		);

		if (unconditional || pointerScoped) continue;
		if (widthBand && restatedUnconditionally) continue;

		offenders.push(
			`"${rule.selector}" gets its 44px floor only inside ${rule.context.join(' ')}, and no ` +
				`unconditional rule sets it. Widths above that band have no floor.`
		);
	}

	check(
		'no 44px target floor is confined to a width band',
		offenders.length === 0,
		offenders.length ? [...new Set(offenders)].join('\n       ') : `${floors} floors checked`
	);
}

/* ---------------------------------------------------------------------- done */

console.log(
	`\nresponsive.mjs: ${checks - failures.length} of ${checks} checks passed` +
		(failures.length ? `, ${failures.length} FAILED` : '')
);
process.exit(failures.length === 0 ? 0 : 1);