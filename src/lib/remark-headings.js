/**
 * mdsvex does not put an `id` on headings, so the table of contents has nothing
 * to link to. This remark plugin adds one.
 *
 * Two forms are supported:
 *
 *   ## Gladius            ->  id="gladius"      (slugified from the text)
 *   ## The rule {#rule}   ->  id="rule"         (author supplied)
 *
 * The explicit form is what the docs use, because a hand written id survives a
 * heading reword. `src/lib/docs/search.ts` reads the same `{#id}` back out of the
 * raw markdown to build the index, so both sides agree by construction.
 *
 * Written as JS with a hand rolled walk, because mdsvex pulls this in from a
 * Vite config and a transitive `unist-util-visit` is not a safe dependency.
 */

const CUSTOM_ID = /\s*\{#([\w-]+)\}\s*$/;

/**
 * The slice of an mdast node this plugin touches, described in JSDoc so the file
 * stays valid JavaScript. `vite.config.ts` imports it directly.
 *
 * @typedef {{
 *   type: string;
 *   value?: string;
 *   depth?: number;
 *   children?: MdastNode[];
 *   data?: { hProperties?: { id?: string } };
 * }} MdastNode
 */

/**
 * Lowercase, non-alphanumerics to single dashes, trimmed. Matches GitHub's rule.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Flatten a heading's children, including the inline code and link text mdsvex
 * produces.
 * @param {MdastNode | undefined | null} node
 * @returns {string}
 */
function toText(node) {
	if (!node) return '';
	if (typeof node.value === 'string') return node.value;
	if (!Array.isArray(node.children)) return '';
	return node.children.map(toText).join('');
}

/**
 * Depth first walk. mdsvex has no exposed visitor, and depending on
 * `unist-util-visit` transitively is not something a build plugin should do.
 * @param {MdastNode} node
 * @param {(node: MdastNode) => void} visit
 */
function walk(node, visit) {
	if (!node || typeof node !== 'object') return;
	visit(node);
	if (Array.isArray(node.children)) {
		for (const child of node.children) walk(child, visit);
	}
}

/** @returns {(tree: MdastNode) => void} */
export function remarkHeadingIds() {
	return (tree) => {
		/** Guards against two headings slugifying to the same anchor. @type {Set<string>} */
		const used = new Set();

		walk(tree, (node) => {
			if (node.type !== 'heading') return;
			const depth = node.depth ?? 0;
			if (depth < 2 || depth > 3) return;

			const children = node.children ?? [];
			let id;

			// An explicit `{#id}` always sits at the end of the heading text.
			const last = children[children.length - 1];
			const lastValue = last?.value;
			if (last?.type === 'text' && typeof lastValue === 'string' && CUSTOM_ID.test(lastValue)) {
				id = /** @type {RegExpMatchArray} */ (lastValue.match(CUSTOM_ID))[1];
				last.value = lastValue.replace(CUSTOM_ID, '');
				if (!String(last.value).trim()) children.pop();
			}

			if (!id) id = slugify(toText(node));

			if (used.has(id)) {
				let n = 2;
				while (used.has(`${id}-${n}`)) n += 1;
				id = `${id}-${n}`;
			}
			used.add(id);

			node.data = {
				...(node.data ?? {}),
				hProperties: { ...(node.data?.hProperties ?? {}), id }
			};
		});
	};
}