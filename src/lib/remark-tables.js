/**
 * mdsvex emits a bare `<table>`. On a phone that means a wide table in a narrow prose
 * column with no way to tell which column a cell belongs to once it has scrolled, and
 * with nothing to scroll because the overflow escapes the prose measure and drags the
 * whole page sideways.
 *
 * This plugin does three things to every table in the docs:
 *
 *   1. Wraps it in `<div class="table-scroll">`, which is the element the responsive
 *      card mode and the horizontal scroll both hang off. A wrapper is added here
 *      rather than by hand in every markdown file because a hand written wrapper is a
 *      thing a later edit can forget, and then the table silently goes back to
 *      behaving the old way on one page only.
 *   2. Copies each header cell's text onto every body cell below it as `data-label`,
 *      so the stacked form can name the column it is showing. Without this the cards
 *      would show bare values and be harder to read than the table was.
 *   3. Adds `class="data"` to the table, which is the hook the landing page's own
 *      tables already use.
 *
 * Written as JS with a hand rolled walk, for the reason `remark-headings.js` gives:
 * mdsvex pulls this in from a Vite config and a transitive `unist-util-visit` is not a
 * safe build dependency.
 */

/**
 * @typedef {{
 *   type: string;
 *   value?: string;
 *   depth?: number;
 *   align?: Array<string | null>;
 *   children?: MdastNode[];
 *   data?: { hProperties?: Record<string, string> };
 * }} MdastNode
 */

/**
 * Flatten a cell's children to plain text, including the inline code and link text
 * mdsvex produces. The label a reader sees has to match the label the table shows, so
 * this has to see through `inlineCode` and `link` nodes the same way the column header
 * does.
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

/**
 * Collect the header labels of a GFM table, in column order.
 * @param {MdastNode} table
 * @returns {string[]}
 */
function headerLabels(table) {
	/** @type {MdastNode[]} */
	const rows = table.children ?? [];
	const head = rows.find((row) => row.type === 'tableRow');
	if (!head) return [];
	/** @type {MdastNode[]} */
	const cells = head.children ?? [];
	return cells.map((cell) => toText(cell).trim());
}

/**
 * Label every body cell with its column name and mark the table for the shared styles.
 *
 * @param {MdastNode} table
 */
function labelTable(table) {
	const labels = headerLabels(table);
	if (labels.length === 0) return;

	const headerRow = table.children?.[0];
	/** @type {MdastNode[]} */
	const rows = table.children ?? [];
	for (const row of rows) {
		if (row.type !== 'tableRow' || row === headerRow) continue;
		/** @type {MdastNode[]} */
		const cells = row.children ?? [];
		cells.forEach((cell, i) => {
			const label = labels[i];
			if (!label) return;
			cell.data = {
				...(cell.data ?? {}),
				hProperties: { ...(cell.data?.hProperties ?? {}), 'data-label': label }
			};
		});
	}

	table.data = {
		...(table.data ?? {}),
		hProperties: { ...(table.data?.hProperties ?? {}), class: 'data' }
	};
}

/**
 * Replace each table node with [wrapper, table, closer] in its parent's children.
 *
 * @param {MdastNode} node
 */
function wrapTables(node) {
	if (!Array.isArray(node.children)) return;
	const next = [];
	let order = 0;
	for (const child of node.children) {
		if (child.type === 'table') {
			order += 1;
			labelTable(child);
			next.push({ type: 'html', value: `<div class="table-scroll" data-table="${order}">` });
			next.push(child);
			next.push({ type: 'html', value: '</div>' });
		} else {
			wrapTables(child);
			next.push(child);
		}
	}
	node.children = next;
}

/** @returns {(tree: MdastNode) => void} */
export function remarkTables() {
	return (tree) => {
		walk(tree, (node) => {
			if (node.type !== 'root') return;
			wrapTables(node);
		});
	};
}