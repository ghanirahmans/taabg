<script lang="ts">
	import { page } from '$app/state';
	import Sidebar from '#lib/components/Sidebar.svelte';
	import { palette } from '#lib/search/palette.svelte';

	let { children, data } = $props();

	let drawerOpen = $state(false);
	let drawerTrigger = $state<HTMLButtonElement | null>(null);

	/** Headings for the page currently being read, wired to explicit anchors. */
	const current = $derived(data.docIndex.find((entry) => entry.slug === page.params.slug));

	$effect(() => {
		const main = document.querySelector('main');
		if (!main) return;

		if (drawerOpen) {
			const width = window.innerWidth - document.documentElement.clientWidth;
			document.body.style.overflow = 'hidden';
			if (width > 0) document.body.style.paddingRight = `${width}px`;
			main.setAttribute('inert', '');
		} else {
			document.body.style.overflow = '';
			document.body.style.paddingRight = '';
			main.removeAttribute('inert');
		}

		return () => {
			document.body.style.overflow = '';
			document.body.style.paddingRight = '';
			main.removeAttribute('inert');
		};
	});

	function closeDrawer(returnFocus = false) {
		drawerOpen = false;
		if (returnFocus) drawerTrigger?.focus();
	}
</script>

<svelte:head>
	<meta name="robots" content="index, follow" />
</svelte:head>

<div class="docs-grid">
	<aside class="rail">
		<Sidebar />
	</aside>

	<div class="content">
		<!-- Drawer trigger only matters where the rail is hidden. -->
		<div class="drawer-bar lg:hidden">
			<button
				bind:this={drawerTrigger}
				type="button"
				class="drawer-trigger"
				aria-expanded={drawerOpen}
				aria-controls="docs-drawer"
				onclick={() => (drawerOpen = true)}
			>
				Browse documentation
			</button>
			<button type="button" class="drawer-trigger" onclick={() => palette.show()}>
				Search
			</button>
		</div>

		{@render children?.()}
	</div>

	{#if current && current.headings.length > 0}
		<aside class="toc" aria-label="On this page">
			<p class="micro-label mb-3">On this page</p>
			<ul class="space-y-1.5">
				{#each current.headings as heading (heading.id)}
					<li>
						<a href="/docs/{current.slug}#{heading.id}" class="toc-link" data-depth={heading.depth}>
							{heading.title}
						</a>
					</li>
				{/each}
			</ul>
		</aside>
	{/if}
</div>

{#if drawerOpen}
	<button
		type="button"
		class="drawer-scrim"
		tabindex="-1"
		aria-hidden="true"
		onclick={() => closeDrawer(false)}
	></button>
	<div
		id="docs-drawer"
		class="drawer"
		role="dialog"
		aria-label="Documentation navigation"
		aria-modal="true"
		tabindex="-1"
		onkeydown={(event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				closeDrawer(true);
			}
		}}
	>
		<div class="drawer-head">
			<p class="micro-label">Documentation</p>
			<button type="button" class="drawer-close" aria-label="Close navigation" onclick={() => closeDrawer(true)}>
				Close
			</button>
		</div>
		<Sidebar onNavigate={() => closeDrawer(false)} />
	</div>
{/if}

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

	.toc {
		display: none;
		position: sticky;
		top: calc(var(--spacing-header) + 2.5rem);
		max-height: calc(100dvh - var(--spacing-header) - 5rem);
		overflow-y: auto;
		font-size: var(--text-support);
	}

	@media (min-width: 1280px) {
		.toc {
			display: block;
		}
	}

	.toc-link {
		display: block;
		color: color-mix(in srgb, var(--color-content) 65%, transparent);
		text-decoration: none;
		line-height: 1.5;
		padding: 0.125rem 0;
	}

	.toc-link[data-depth='3'] {
		padding-left: 1rem;
	}

	.toc-link:hover {
		color: var(--color-content);
	}

	.drawer-bar {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 2.5rem;
	}

	.drawer-trigger {
		flex: 1;
		height: 2.75rem;
		font-family: inherit;
		font-size: var(--text-support);
		color: color-mix(in srgb, var(--color-content) 80%, transparent);
		background-color: var(--color-base-200);
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	/* Control boundary: clears 3:1 against base-100, unlike the hairlines. */
	.drawer-trigger {
		border-color: var(--color-border-strong);
	}

	.drawer-trigger:hover {
		color: var(--color-content);
		border-color: var(--color-content-muted);
	}

	.drawer-scrim {
		position: fixed;
		inset: 0;
		background-color: rgb(0 0 0 / 0.6);
		border: 0;
		z-index: 40;
		cursor: default;
	}

	.drawer {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: min(20rem, 88vw);
		z-index: 41;
		background-color: var(--color-base-100);
		border-right: 1px solid var(--color-base-300);
		padding: 1.5rem;
		overflow-y: auto;
	}

	.drawer-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--color-base-300);
	}

	.drawer-close {
		font-family: inherit;
		font-size: var(--text-small);
		color: var(--color-primary);
		background-color: transparent;
		border: 0;
		cursor: pointer;
		padding: 0.5rem;
	}

	@media (max-width: 1023px) {
		.docs-grid {
			padding: 2.5rem 1.5rem 4rem;
		}
	}

	@media (max-width: 767px) {
		/* 44px touch targets on the drawer triggers. */
		.drawer-trigger,
		.drawer-close {
			height: 44px;
		}

		.drawer-trigger {
			flex: none;
			padding: 0 1rem;
		}
	}
</style>