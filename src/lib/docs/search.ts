import { DOC_ENTRIES } from './manifest';

export interface DocHeading {
	/** Matches the explicit `{#id}` written in the markdown. */
	id: string;
	title: string;
	depth: 2 | 3;
}

export interface DocIndexEntry {
	slug: string;
	title: string;
	section: string;
	description: string;
	keywords: string[];
	order: number;
	headings: DocHeading[];
	/** Markdown body with code fences and directives removed, for matching. */
	body: string;
}

export type DocIndex = DocIndexEntry[];

/**
 * Headings carry an explicit `{#id}` in the markdown, so the table of contents
 * and the on-page anchors are wired together by the author rather than by a
 * slugifier both sides have to agree on.
 */
const HEADING = /^#{2,3}\s+(.+?)\s*\{#([\w-]+)\}\s*$/;
const FENCE = /^(```|~~~)/;

export function parseDoc(slug: string, raw: string): Pick<DocIndexEntry, 'headings' | 'body'> {
	const headings: DocHeading[] = [];
	const bodyLines: string[] = [];
	let inFence = false;

	for (const line of raw.split('\n')) {
		if (FENCE.test(line)) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		const match = HEADING.exec(line);
		if (match) {
			headings.push({ id: match[2], title: match[1], depth: line.startsWith('### ') ? 3 : 2 });
			continue;
		}
		bodyLines.push(line);
	}

	return { headings, body: bodyLines.join('\n') };
}

export function buildIndex(sources: Record<string, string>): DocIndex {
	return DOC_ENTRIES.map((entry) => {
		const raw = sources[`/src/lib/docs/${entry.slug}.md`] ?? '';
		return { ...entry, ...parseDoc(entry.slug, raw) };
	});
}

export interface SearchHit {
	title: string;
	slug: string;
	section: string;
	excerpt: string;
	/** Present when the hit is a heading deeper in a page. */
	anchor?: string;
}

function normalize(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\w\s-]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function queryIndex(index: DocIndex, query: string): SearchHit[] {
	const q = normalize(query);
	if (!q) {
		return index.map((entry) => ({
			title: entry.title,
			slug: entry.slug,
			section: entry.section,
			excerpt: entry.description
		}));
	}

	const scored: { hit: SearchHit; score: number; order: number }[] = [];

	for (const entry of index) {
		const title = normalize(entry.title);
		const keywords = entry.keywords.map(normalize);

		let score = 0;
		if (title === q) score = 100;
		else if (title.startsWith(q)) score = 80;
		else if (title.includes(q)) score = 60;
		else if (keywords.some((k) => k === q)) score = 45;
		else if (keywords.some((k) => k.startsWith(q))) score = 30;
		else if (keywords.some((k) => k.includes(q))) score = 20;

		// Body match is the weakest tier and the reason the excerpt exists: the hit
		// names the page, and `excerptFor` pulls the sentence around the match.
		else if (normalize(entry.body).includes(q)) score = 10;

		if (score > 0) {
			scored.push({
				hit: { title: entry.title, slug: entry.slug, section: entry.section, excerpt: entry.description },
				score,
				order: entry.order
			});
		}

		for (const heading of entry.headings) {
			const h = normalize(heading.title);
			let hScore = 0;
			if (h === q) hScore = 70;
			else if (h.startsWith(q)) hScore = 50;
			else if (h.includes(q)) hScore = 30;

			if (hScore > 0) {
				scored.push({
					hit: {
						title: entry.title,
						slug: entry.slug,
						section: entry.section,
						excerpt: heading.title,
						anchor: heading.id
					},
					score: hScore,
					order: entry.order
				});
			}
		}
	}

	return scored
		.sort((a, b) => b.score - a.score || a.order - b.order)
		.map((s) => s.hit)
		.slice(0, 8);
}

/** Real content of a hit: the sentence around the match, not the description. */
export function excerptFor(index: DocIndex, hit: SearchHit, query: string): string {
	if (!query.trim()) return hit.excerpt;
	const entry = index.find((d) => d.slug === hit.slug);
	if (!entry) return hit.excerpt;
	if (normalize(hit.excerpt).includes(normalize(query))) return hit.excerpt;

	const flat = entry.body
		.replace(/^#{2,3}\s.*$/gm, '')
		.replace(/\s+/g, ' ')
		.trim();

	// Search the flattened text directly instead of a normalised copy: collapsing
	// punctuation and whitespace shifts every offset after the first match, so a
	// slice taken from normalised indices would cut the wrong span of text.
	const needle = query.trim().toLowerCase();
	let at = flat.toLowerCase().indexOf(needle);

	// No case-insensitive hit: either the term only matches after normalisation
	// (so its offset in `flat` is unknowable) or it is absent entirely. Either way
	// the description is the honest thing to show.
	if (at === -1) return entry.description;

	const from = Math.max(0, at - 70);
	const raw = flat.slice(from, from + 150);
	return (from > 0 ? '…' : '') + raw.trim();
}