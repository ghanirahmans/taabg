<script lang="ts">
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';
	import type { Component } from 'svelte';
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import { findDoc, neighbours } from '#lib/docs/manifest';

	let { data } = $props();

	/**
	 * mdsvex compiles each markdown file to a component, and the loader hands it
	 * over as data. `Component<any>` is what Svelte 5's `<svelte:component>` and
	 * a dynamic tag both accept; the props are untyped because the markdown
	 * component takes none.
	 */
	const Content: Component<Record<string, never>> = $derived(data.content as Component<Record<string, never>>);
	const entry = $derived(findDoc(data.slug));
	const { prev, next } = $derived(neighbours(data.slug));

	/**
	 * mdsvex emits the code frame with a plain copy button, because the highlighter
	 * runs at compile time and cannot wire up a handler. One delegated listener
	 * covers every block on the page instead of one listener per block.
	 */
	function enableCopy(node: HTMLElement) {
		/**
		 * @param {Event} event
		 */
		const onClick = async (event: Event) => {
			const target = event.target as HTMLElement | null;
			const button = target?.closest<HTMLButtonElement>('[data-copy]');
			if (!button) return;

			const frame = button.closest('.codeblock');
			const pre = frame?.querySelector('pre');
			if (!pre) return;

			try {
				await navigator.clipboard.writeText(pre.textContent ?? '');
				button.textContent = 'Copied';
				button.setAttribute('data-state', 'copied');
				setTimeout(() => {
					button.textContent = 'Copy';
					button.setAttribute('data-state', 'idle');
				}, 1600);
			} catch {
				button.textContent = 'Copy blocked';
				setTimeout(() => {
					button.textContent = 'Copy';
				}, 1600);
			}
		};

		node.addEventListener('click', onClick);

		return {
			destroy() {
				node.removeEventListener('click', onClick);
			}
		};
	}
</script>

<svelte:head>
	<title>{data.title}, taabg documentation</title>
	<meta name="description" content={entry?.description} />
</svelte:head>

<article>
	<header class="mb-12 border-b border-base-300 pb-8">
		<Breadcrumbs section={data.section} title={data.title} />
		<!--
			Larger than the h2 below it, which it used to match. Both were 28px, so a
			page title and a section heading rendered at the same size and the page had
			no clear top. The landing page does not have this problem because its h1 is
			`--text-display`.
		-->
		<h1 class="text-[2.125rem] leading-tight lg:text-[2.75rem]">{data.title}</h1>
		{#if entry}
			<p class="mt-4 text-[0.9375rem] leading-relaxed text-content-muted">{entry.description}</p>
			<!--
				What the page leaves the reader able to do.

				This used to name the repository file the page was written from and
				tell the reader that the repository wins on any disagreement. Both
				halves were wrong for a reader without repository access: there was
				nothing to open, and no authority to defer to. Stating the outcome
				instead gives the reader something to check themselves, which is
				what the earlier version failed to do.
			-->
			<p class="source">{entry.outcome}.</p>
		{/if}
	</header>

	<div class="prose" use:enableCopy>
		<Content />
	</div>

	<nav aria-label="Documentation pages" class="mt-20 grid gap-5 border-t border-base-300 pt-8 sm:grid-cols-2">
		{#if prev}
			<a href="/docs/{prev.slug}" class="pager">
				<span class="micro-label flex items-center gap-1.5">
					<ArrowLeft size={12} strokeWidth={2} aria-hidden="true" /> Previous
				</span>
				<span class="mt-1 text-sm">{prev.title}</span>
			</a>
		{:else}
			<span></span>
		{/if}

		{#if next}
			<a href="/docs/{next.slug}" class="pager sm:text-right">
				<span class="micro-label flex items-center gap-1.5 sm:justify-end">
					Next <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
				</span>
				<span class="mt-1 block text-sm">{next.title}</span>
			</a>
		{/if}
	</nav>
</article>

<style>
	.source {
		margin-top: 1.5rem;
		padding: 0.875rem 1rem;
		background-color: var(--color-base-200);
		border-left: 2px solid var(--color-primary);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		max-width: 62ch;
		font-size: var(--text-small);
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-content) 68%, transparent);
	}

	.pager {
		display: block;
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-md);
		padding: 1.125rem 1.25rem;
		background-color: var(--color-base-200);
		text-decoration: none;
		transition:
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.pager:hover {
		border-color: var(--color-base-400);
		background-color: var(--color-base-300);
	}
</style>