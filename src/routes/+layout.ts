import { buildIndex, type DocIndex } from '#lib/docs/search';

export const prerender = true;

/**
 * Raw markdown for every docs page, read at build time to build the search index
 * and the per-page table of contents. Headings carry an explicit `{#id}` in the
 * markdown, so the anchors in the index match the rendered markup.
 */
const sources = import.meta.glob('/src/lib/docs/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export function load(): { docIndex: DocIndex } {
	return { docIndex: buildIndex(sources) };
}