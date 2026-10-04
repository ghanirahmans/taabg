import adapter from '@sveltejs/adapter-static';
import { mdsvex } from 'mdsvex';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { highlight } from './src/lib/highlight.js';
import { remarkHeadingIds } from './src/lib/remark-headings.js';
import { remarkTables } from './src/lib/remark-tables.js';

/**
 * A fenced code block in a docs page is highlighted at compile time and emitted
 * with the same frame markup `CodeBlock.svelte` uses, so docs and landing page
 * share one code surface and one copy-button style. The language label is
 * escaped because it comes from an author-controlled info string.
 */
function escapeLabel(value: string | undefined): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * The label is the author's fence tag, not the resolved grammar, so the reader
 * sees what they wrote. An untagged fence gets no label at all rather than a
 * guessed one: a Telegram transcript tagged `text` is not shell, and labelling it
 * `shell` would assert a language it is not.
 * @param {string} code
 * @param {string | null | undefined} lang
 */
function wrapBlock(code: string, lang?: string | null): string {
	const tag = String(lang ?? '')
		.trim()
		.toLowerCase();
	const label = tag && tag !== 'text' && tag !== 'txt' ? escapeLabel(tag) : '';
	const bar = [
		'<div class="codeblock-bar">',
		label ? `<span class="codeblock-lang">${label}</span>` : '',
		'<button type="button" class="codeblock-copy" data-copy aria-label="Copy code">Copy</button>',
		'</div>'
	].join('');

	return [
		'<div class="codeblock">',
		bar,
		highlight(code, lang ?? 'text'),
		'</div>'
	].join('');
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			extensions: ['.svelte', '.md', '.svx'],
			preprocess: [
				mdsvex({
					extensions: ['.md', '.svx'],
					// mdsvex emits no heading ids, so the table of contents would have
					// nothing to anchor to without this. The table plugin runs after it so
					// that heading ids are already in place when a table is wrapped, which
					// keeps the two independent of each other.
					remarkPlugins: [remarkHeadingIds, remarkTables],
					highlight: { highlighter: wrapBlock }
				})
			],
			adapter: adapter({
				pages: 'build',
				assets: 'build',
				precompress: false,
				strict: true
			}),
			prerender: {
				handleHttpError: 'fail'
			}
		})
	]
});