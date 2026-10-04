<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		section: string;
		title: string;
	}

	let { section, title }: Props = $props();

	/**
	 * Section names become fragment identifiers on the docs index.
	 *
	 * Kept here rather than duplicated in the index because the two have to agree,
	 * and the failure would be a breadcrumb link that scrolls nowhere. `Core Concepts`
	 * becomes `core-concepts`, matching the shape of the heading ids the docs
	 * markdown uses for the same job.
	 */
	function slugify(value: string): string {
		return value
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-');
	}

	/**
	 * Breadcrumbs. The research is blunt about who needs them: a reader who landed
	 * here from a search engine has no idea how deep they are. Every segment but
	 * the last is a link, so it works as navigation and not decoration.
	 */
</script>

<nav aria-label="Breadcrumb" class="crumbs">
	<ol>
		<li>
			<a href="/docs">Docs</a>
		</li>
		<li aria-hidden="true" class="sep">
			<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
		</li>
		<li>
			<!--
				The section is a link, not a label. It used to be plain text, which left
				"Docs" as the only way back and made the middle of the trail decorative.
				The index carries a heading per section, so this jumps to the part of the
				index that lists the siblings of the page you are on.
			-->
			<a href="/docs#{slugify(section)}">{section}</a>
		</li>
		<li aria-hidden="true" class="sep">
			<ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
		</li>
		<li>
			<!-- The current page: not a link, and marked for assistive tech. -->
			<span aria-current="page" class="crumb-current">{title}</span>
		</li>
	</ol>
</nav>

<style>
	.crumbs {
		font-size: var(--text-small);
		margin-bottom: 1.25rem;
	}

	ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	/*
	 * Both dimensions, not just the height.
	 *
	 * Measured at every width: "Docs" came out 28 by 18 and "Getting Started" 87 by 18.
	 * These are navigation, not prose, and a reader who has landed here from a search
	 * engine is most likely to want to go back up a level. Fixing the height alone
	 * left the short segments 28px and 39px wide, so `min-width` centres the label
	 * inside a 44px target and the trail looks exactly where it did before.
	 */
	a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		min-width: 44px;
		color: color-mix(in srgb, var(--color-content) 65%, transparent);
		text-decoration: none;
	}

	a:hover {
		color: var(--color-content);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.sep {
		display: inline-flex;
		/* 50% not 35%: even a decorative chevron is a glyph a low-vision reader
		 * has to find, and 35% measures 2.89:1. */
		color: color-mix(in srgb, var(--color-content) 50%, transparent);
	}

	/* The leaf is the page you are on, so it carries the full content weight. */
	.crumb-current {
		color: var(--color-content);
	}
</style>