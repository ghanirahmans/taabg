import { error } from '@sveltejs/kit';
import type { Component } from 'svelte';
import { DOC_ENTRIES, findDoc } from '#lib/docs/manifest';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

/** Prerender every page listed in the manifest, and nothing else. */
export const entries: EntryGenerator = () => DOC_ENTRIES.map((doc) => ({ slug: doc.slug }));

const modules = import.meta.glob('/src/lib/docs/*.md');

export const load: PageLoad = async ({ params }) => {
	const entry = findDoc(params.slug);
	const load = modules[`/src/lib/docs/${params.slug}.md`];

	// The manifest is the gate, not the filesystem: a stray markdown file must not
	// become a reachable page, and a manifest entry with no file is a build error.
	if (!entry || !load) {
		error(404, `No documentation page named "${params.slug}".`);
	}

	const module = (await load()) as { default: Component };

	return {
		slug: entry.slug,
		title: entry.title,
		section: entry.section,
		outcome: entry.outcome,
		content: module.default
	};
};