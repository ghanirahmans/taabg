/*
 * Navigation and document structure, read from the built HTML.
 *
 * `nav.mjs` used to live in `tmp-verify/` and was deleted after each run, which meant
 * it could not be run twice in a row without being rewritten first. It is here now,
 * next to `responsive.mjs`, because a guard you have to reconstruct before you can
 * trust is a guard you end up not running.
 *
 * It reads `build/`, so `bun run build` has to come first.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BUILD = join(process.cwd(), 'build');

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

if (!existsSync(BUILD)) {
	console.error('No build/ directory. Run "bun run build" first.');
	process.exit(1);
}

/* ------------------------------------------------------------------ read the build */

const docDir = join(BUILD, 'docs');
if (!existsSync(docDir)) {
	console.error('No build/docs. The adapter writes pages, so this is a build problem.');
	process.exit(1);
}

/*
 * The layout is `build/docs.html` for the index and `build/docs/<slug>.html` for the
 * pages, not `build/docs/index.html`. adapter-static with `pages: 'build'` writes the
 * index as a sibling file because the route has no child segments, so the obvious
 * guess is wrong and the first version of this guard crashed on it.
 */
const indexPath = join(BUILD, 'docs.html');
if (!existsSync(indexPath)) {
	console.error(`No ${indexPath}. The docs index route did not prerender.`);
	process.exit(1);
}

const docFiles = readdirSync(docDir).filter((f) => f.endsWith('.html'));
const indexHtml = readFileSync(indexPath, 'utf8');
const landingHtml = readFileSync(join(BUILD, 'index.html'), 'utf8');

const pages = new Map([
	['/', { html: landingHtml, label: 'landing' }],
	['/docs', { html: indexHtml, label: 'docs index' }]
]);
for (const file of docFiles) {
	const slug = file.replace(/\.html$/, '');
	pages.set(`/docs/${slug}`, { html: readFileSync(join(docDir, file), 'utf8'), label: slug });
}

/* Attribute order is not guaranteed, so pull an attribute value by name. */
function attr(tag, name) {
	const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
	return m ? m[1] : null;
}

const stripTags = (html) => html.replace(/<[^>]*>/g, ' ');

function headings(html) {
	return [...html.matchAll(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
		level: Number(m[1]),
		id: attr(m[2] ?? '', 'id'),
		text: stripTags(m[3]).replace(/\s+/g, ' ').trim()
	}));
}

/* Every href on the page, absolute or root relative. */
function hrefs(html) {
	return [...html.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]);
}

/* ======================================================= 1. every page is reachable */

section('1. Every built page is linked from somewhere');

{
	const linked = new Set();
	for (const { html } of pages.values()) {
		for (const href of hrefs(html)) {
			const path = href.split('#')[0].split('?')[0];
			if (path) linked.add(path);
		}
	}

	const unreachable = [...pages.keys()].filter((p) => !linked.has(p));
	check(
		'no page is orphaned',
		unreachable.length === 0,
		unreachable.length ? `never linked: ${unreachable.join(', ')}` : `${pages.size} pages, all linked`
	);
}

/* ================================================== 2. no link goes nowhere */

section('2. No link points at a page that was not built');

{
	const dangling = [];
	for (const [from, { html }] of pages) {
		for (const href of hrefs(html)) {
			if (/^(https?:|mailto:|tel:)/.test(href)) continue;
			const [path, fragment] = href.split('#');
			const clean = path.split('?')[0];

			if (clean === '') {
				// A bare fragment: the current page.
				if (fragment && !new RegExp(`id="${fragment}"`).test(html)) {
					dangling.push(`${from} -> #${fragment} (no such id on this page)`);
				}
				continue;
			}

			// `/` is the landing page, not "the current page". The first version of this
			// guard treated it as the same page and reported all 27 header chips
			// (`/#capabilities` and friends) as dangling, on every page.
			const target = clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
			if (!pages.has(target)) {
				dangling.push(`${from} -> ${href} (no such page)`);
				continue;
			}
			if (fragment) {
				const targetHtml = pages.get(target).html;
				if (!new RegExp(`id="${fragment}"`).test(targetHtml)) {
					dangling.push(`${from} -> ${href} (no id "${fragment}" in ${target})`);
				}
			}
		}
	}

	check(
		'every internal link resolves, fragment included',
		dangling.length === 0,
		dangling.length ? [...new Set(dangling)].join('\n       ') : undefined
	);
}

/* ============================================ 3. one h1 per page, and it is unique */

section('3. One h1 per page, and heading ids are unique');

for (const [path, { html, label }] of pages) {
	const hs = headings(html);
	const h1s = hs.filter((h) => h.level === 1);
	check(`${label} has exactly one h1`, h1s.length === 1, h1s.length === 0 ? 'none' : `${h1s.length} found`);

	const withIds = hs.filter((h) => h.id).map((h) => h.id);
	const dupes = [...new Set(withIds.filter((id, i) => withIds.indexOf(id) !== i))];
	check(`${label} heading ids are unique`, dupes.length === 0, dupes.length ? `repeated: ${dupes.join(', ')}` : undefined);

	// Levels must not skip. h1 then h4 is a document with a hole in it.
	let previous = 1;
	const jumps = [];
	for (const h of hs) {
		if (h.level > previous + 1) jumps.push(`h${previous} to h${h.level} at "${h.text.slice(0, 40)}"`);
		previous = h.level;
	}
	check(`${label} heading levels do not skip`, jumps.length === 0, jumps.join('; '));

	// Every docs page title must be reachable from the index, which is what the
	// docs index list is for.
	if (path !== '/' && path !== '/docs') {
		check(`${label} is listed on the docs index`, indexHtml.includes(path), `not referenced from /docs`);
	}
}

/* ================================ 4. the breadcrumb's section link has a target */

section('4. The breadcrumb section link resolves on the docs index');

{
	const crumbSections = new Set();
	for (const { html } of pages.values()) {
		for (const href of hrefs(html)) {
			const m = href.match(/^\/docs#([\w-]+)$/);
			if (m) crumbSections.add(m[1]);
		}
	}
	const indexIds = new Set([...indexHtml.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
	const missing = [...crumbSections].filter((s) => !indexIds.has(s));
	check(
		'every breadcrumb section anchor exists on the index',
		missing.length === 0,
		missing.length ? `no heading id for: ${missing.join(', ')}` : `${crumbSections.size} section anchors`
	);
}

/* ============= 5. every anchor works, and every heading is reachable from one */

section('5. Same-page anchors resolve, and every heading can be jumped to');

{
	/*
	 * A same-page anchor can be written three ways and all three have to count.
	 *
	 *   #rule                     bare fragment
	 *   /docs/architecture#rule   absolute path, which is what the table of contents
	 *                             emits, because the links are built from the slug
	 *   ./architecture#rule       relative path
	 *
	 * The first version of this guard only recognised the bare form and reported all 76
	 * headings on all eight docs pages as unreachable. The table of contents was in the
	 * prerendered HTML the whole time.
	 */
	const fragmentOf = (href, pagePath) => {
		const [path, fragment] = href.split('#');
		if (!fragment) return null;
		const clean = path.split('?')[0];
		if (clean === '') return fragment;
		const normalised = clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
		return normalised === pagePath ? fragment : null;
	};

	const brokenAnchors = [];
	const unreachableHeadings = [];

	for (const [path, { html, label }] of pages) {
		const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

		for (const href of hrefs(html)) {
			const fragment = fragmentOf(href, path);
			if (fragment === null) continue;
			if (!ids.has(fragment)) brokenAnchors.push(`${label} -> ${href}`);
		}

		if (path === '/' || path === '/docs') continue;

		// A heading with an id that nothing links to is a heading the reader cannot
		// reach by keyboard, which is the whole point of giving it an id.
		const linked = new Set(
			hrefs(html).map((h) => fragmentOf(h, path)).filter((f) => f !== null)
		);
		for (const h of headings(html)) {
			if (h.level < 2 || h.level > 3) continue;
			if (!h.id) continue;
			if (!linked.has(h.id)) unreachableHeadings.push(`${label} heading "${h.text.slice(0, 40)}" (#${h.id})`);
		}
	}

	check(
		'every same-page anchor resolves',
		brokenAnchors.length === 0,
		brokenAnchors.length ? [...new Set(brokenAnchors)].join('\n       ') : undefined
	);

	check(
		'every h2 and h3 is linked from its own page',
		unreachableHeadings.length === 0,
		unreachableHeadings.length ? [...new Set(unreachableHeadings)].join('\n       ') : undefined
	);
}

/* ============================== 6. images declare a size, or the page jumps */

section('6. Every image declares width and height');

{
	const missing = [];
	for (const [path, { html, label }] of pages) {
		for (const m of html.matchAll(/<img\b[^>]*>/g)) {
			const tag = m[0];
			if (attr(tag, 'alt') === null) missing.push(`${label}: an <img> has no alt attribute`);
			if (attr(tag, 'width') === null || attr(tag, 'height') === null) {
				missing.push(`${label}: an <img> has no width/height, so it reserves no space`);
			}
		}
	}
	check(
		'images are sized and described',
		missing.length === 0,
		missing.length ? [...new Set(missing)].join('\n       ') : undefined
	);
}

/* ================================ 7. every page names its document language */

section('7. Every page carries a language and a title');

{
	const problems = [];
	for (const [path, { html, label }] of pages) {
		const htmlTag = html.match(/<html\b[^>]*>/i);
		if (!htmlTag || !/\blang="[a-z-]+"/i.test(htmlTag[0])) problems.push(`${label}: no lang on <html>`);
		if (!/<title>.{10,}<\/title>/i.test(html)) problems.push(`${label}: missing or very short <title>`);
		void path;
	}
	check(
		'language and title are present',
		problems.length === 0,
		problems.length ? [...new Set(problems)].join('\n       ') : undefined
	);
}

/* ---------------------------------------------------------------------- done */

console.log(`\nnav.mjs: ${checks - failures} of ${checks} checks passed${failures.length ? `, ${failures} FAILED` : ''}`);
process.exit(failures === 0 ? 0 : 1);