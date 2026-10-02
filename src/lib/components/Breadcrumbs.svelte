<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		section: string;
		title: string;
	}

	let { section, title }: Props = $props();

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
			<span class="crumb-section">{section}</span>
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

	a {
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

	.crumb-section {
		color: color-mix(in srgb, var(--color-content) 65%, transparent);
	}

	/* The leaf is the page you are on, so it carries the full content weight. */
	.crumb-current {
		color: var(--color-content);
	}
</style>