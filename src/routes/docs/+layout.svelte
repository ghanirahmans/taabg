<script lang="ts">
	import { page } from '$app/state';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import Toc from '#lib/components/Toc.svelte';

	let { children, data } = $props();

	/** Headings for the page currently being read, wired to explicit anchors. */
	const current = $derived(data.docIndex.find((entry) => entry.slug === page.params.slug));
</script>

<svelte:head>
	<meta name="robots" content="index, follow" />
</svelte:head>

<div class="docs-grid">
	<aside class="rail">
		<Sidebar />
	</aside>

	<div class="content">
		<!--
			Below 1280px there is no room for a third column, so the table of
			contents becomes a disclosure above the content instead of disappearing.
			Losing in-page navigation entirely on a tablet or phone is the failure
			the research keeps naming.
		-->
		{#if current && current.headings.length > 1}
			<div class="toc-inline">
				<Toc slug={current.slug} headings={current.headings} collapsible />
			</div>
		{/if}

		{@render children?.()}
	</div>

	<!--
		The rail column is always in the grid above 1280px, even with nothing to put
		in it. Rendering it conditionally moved the content column sideways between
		pages, which is exactly the layout shift the research says to avoid.
	-->
	<aside class="toc" aria-label="On this page">
		{#if current && current.headings.length > 0}
			<Toc slug={current.slug} headings={current.headings} />
		{/if}
	</aside>
</div>

<style>
	.docs-grid {
		max-width: var(--shell-max);
		margin: 0 auto;
		padding: 4rem var(--gutter) 7rem;
		display: grid;
		gap: 4rem;
		grid-template-columns: minmax(0, 1fr);
		align-items: start;
	}

	/* Wider rail and a wider table of contents than the dashboard uses: 13.5rem at
	 * 14px was sized for the ops console's labels, and this rail carries section
	 * headings like "Core Concepts" that need the extra room. */
	@media (min-width: 1024px) {
		.docs-grid {
			grid-template-columns: 15rem minmax(0, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.docs-grid {
			grid-template-columns: 15rem minmax(0, 1fr) 14rem;
		}
	}

	.rail {
		display: none;
		position: sticky;
		top: calc(var(--spacing-header) + 2.5rem);
		max-height: calc(100dvh - var(--spacing-header) - 5rem);
		overflow-y: auto;
		padding-right: 1rem;
	}

	@media (min-width: 1024px) {
		.rail {
			display: block;
		}
	}

	.content {
		min-width: 0;
		/* 48rem at 16px lands around 75 characters, inside the comfortable
		 * reading measure. Tables and code scroll instead of stretching. */
		max-width: 48rem;
	}

	/* Desktop rail. Always present above 1280px so the content column never shifts. */
	.toc {
		display: none;
		position: sticky;
		top: calc(var(--spacing-header) + 2.5rem);
		max-height: calc(100dvh - var(--spacing-header) - 5rem);
		overflow-y: auto;
	}

	@media (min-width: 1280px) {
		.toc {
			display: block;
		}
	}

	/* Below 1280px the same list collapses into a disclosure above the prose. */
	.toc-inline {
		margin-bottom: 2rem;
	}

	@media (min-width: 1280px) {
		.toc-inline {
			display: none;
		}
	}

	@media (max-width: 1023px) {
		.docs-grid {
			padding: 2.5rem 1.5rem 4rem;
		}
	}
</style>