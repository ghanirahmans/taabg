<script lang="ts">
	import { page } from '$app/state';
	import PageNav from '#lib/components/PageNav.svelte';
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
		<!--
			Below 1024px the sidebar rail is hidden, so this panel is the whole
			documentation navigation: the page tree on the left, the sections of the
			page you are on on the right.

			Before, reaching a sibling page meant opening the site menu and scrolling
			past two link groups. One sticky control now covers both directions of
			movement, which is the thing a reader on a tablet actually needs.
		-->
		<div class="toc-inline">
			<div class="toc-pair">
				<PageNav />
				{#if current && current.headings.length > 1}
					<Toc slug={current.slug} headings={current.headings} collapsible />
				{:else}
					<div class="toc-empty" aria-hidden="true">
						<span class="micro-label">No sections on this page</span>
					</div>
				{/if}
			</div>
		</div>

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

	/*
	 * Below 1280px the navigation collapses into a two-control panel above the
	 * prose.
	 *
	 * It is sticky, because a static one scrolls out of reach within the first
	 * couple of hundred pixels. Measured on the architecture page, a static panel
	 * was off screen at scroll 1500 of a 6217px page, so on a tablet the whole
	 * in-page navigation became unreachable for the rest of the read.
	 *
	 * The two controls sit side by side rather than stacked. The panel is pinned,
	 * so vertical space is the scarce resource, and a reader should not pay 44px of
	 * permanent height for a second row.
	 */
	.toc-inline {
		position: sticky;
		top: calc(var(--spacing-header) + 0.75rem);
		z-index: 10;
		margin-bottom: 2rem;
	}

	/*
	 * The panel is gone below 1024px, which is the width where `.rail` disappears too.
	 *
	 * Asked for directly: on a phone the pair cost 112px of pinned height, a seventh
	 * of the screen, on every docs page, before the reader had scrolled once. It was
	 * the largest permanent fixture on the smallest screens and it was in the way.
	 *
	 * One breakpoint instead of two regimes. Below 1024px there is now no sidebar and
	 * no panel, so "no navigation rail" is a single fact rather than something that
	 * depends on which of the two happens to be showing.
	 *
	 * What is left on a phone is the site menu, which carries all eight docs pages
	 * grouped by section, and the breadcrumb. What is lost is the list of sections
	 * *within* the page being read: there is no rail, no panel, and no per-page jump
	 * list. Reaching a section means the site menu, then the page, then scrolling.
	 */
	@media (max-width: 1023px) {
		.toc-inline {
			display: none;
		}
	}

	/*
	 * Two controls side by side, and one row tall, because the panel is pinned and
	 * vertical space is the scarce resource.
	 *
	 * That holds from about 480px up. Below it, two columns of a 360px screen are
	 * 136px and 120px, and "On this page" does not fit in 120px: it wrapped to two
	 * lines, so the pair measured 44px and 54px side by side and the row looked
	 * broken rather than compact. Below 480px they stack instead, both at their
	 * natural height.
	 */
	.toc-pair {
		display: grid;
		gap: 0.5rem;
		grid-template-columns: minmax(0, 1fr);
		padding: 0.5rem;
		background-color: var(--color-base-100);
		border-radius: var(--radius-md);
	}

	@media (min-width: 480px) {
		.toc-pair {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}

	/* Keep both the same height if one label ever wraps on a narrow-but-not-tiny
	 * screen, rather than leaving a ragged pair. */
	.toc-pair > :global(*) {
		min-width: 0;
	}

	/*
	 * A page with no sections still needs the row, or the two controls above and
	 * below it would not line up. Placeholder rather than nothing, because an
	 * uneven row reads as a mistake.
	 */
	.toc-empty {
		display: flex;
		align-items: center;
		padding: 0.625rem 0.75rem;
		border: 1px dashed var(--color-base-300);
		border-radius: var(--radius-sm);
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