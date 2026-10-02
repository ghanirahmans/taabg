<script lang="ts">
	import { ArrowUp } from 'lucide-svelte';
	import type { DocHeading } from '#lib/docs/search';

	interface Props {
		slug: string;
		headings: DocHeading[];
		/** Mobile renders the same list inside a disclosure; desktop shows it flat. */
		collapsible?: boolean;
	}

	let { slug, headings, collapsible = false }: Props = $props();

	let open = $state(false);
	let activeId = $state<string | null>(null);
	let root = $state<HTMLElement | null>(null);

	/**
	 * Scroll spy.
	 *
	 * Every source on docs layout agrees the right rail is a control surface, not
	 * decoration: the reader has to know where they are without losing the thread.
	 *
	 * One writer for `activeId`. Two mechanisms both setting it would thrash, so
	 * this is a single effect.
	 *
	 * IntersectionObserver rather than a scroll handler, because a scroll handler
	 * runs on every frame and fights the browser's own scrolling.
	 *
	 * Topmost wins. Several headings are usually in view at once, and taking the
	 * first one that fires makes the marker flicker between two entries. Collecting
	 * the visible set and choosing the first in document order is stable.
	 */
	$effect(() => {
		if (!root) return;

		const nodes = headings
			.map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
			.filter((n): n is { id: string; el: HTMLElement } => n.el !== null);

		if (nodes.length === 0) return;

		/** The heading a reader at the current scroll position is actually on. */
		const resolve = (): string | null => {
			const line = 96; // clears the 4rem sticky header
			let current: string | null = null;
			for (const { id, el } of nodes) {
				if (el.getBoundingClientRect().top <= line) current = id;
			}
			// Above the first heading the first one is the honest answer, and it
			// covers a reader who opened the page on an anchor.
			return current ?? nodes[0].id;
		};

		const visible = new Set<string>();
		activeId = resolve();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visible.add(entry.target.id);
					else visible.delete(entry.target.id);
				}
				const topmost = headings.find((h) => visible.has(h.id));
				// When nothing is in the band the reader is between sections, so
				// the observer alone has no answer and the position check does.
				activeId = topmost?.id ?? resolve();
			},
			{ rootMargin: '-72px 0px -66% 0px', threshold: 0 }
		);

		for (const { el } of nodes) observer.observe(el);

		const onHash = () => (activeId = resolve());
		window.addEventListener('hashchange', onHash);

		return () => {
			observer.disconnect();
			window.removeEventListener('hashchange', onHash);
		};
	});

	// Close the disclosure after a jump, so the reader lands on the section.
	function onJump() {
		open = false;
	}
</script>

<div class="toc-root" bind:this={root}>
	{#if collapsible}
		<button
			type="button"
			class="disclosure"
			aria-expanded={open}
			aria-controls="toc-list"
			onclick={() => (open = !open)}
		>
			<span class="micro-label">On this page</span>
			<svg
				class="chevron"
				data-open={open}
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				aria-hidden="true"
			>
				<path d="m6 9 6 6 6-6" />
			</svg>
		</button>
	{:else}
		<p class="micro-label label">On this page</p>
	{/if}

	<!-- Research is consistent on one point: the rail must not be a dead list of
		links. It shows where you are and it moves you. -->
	<ul id="toc-list" class="list" hidden={collapsible && !open}>
		{#each headings as heading (heading.id)}
			<li>
				<a
					href="/docs/{slug}#{heading.id}"
					class="link"
					data-depth={heading.depth}
					data-active={activeId === heading.id}
					aria-current={activeId === heading.id ? 'location' : undefined}
					onclick={onJump}
				>
					{heading.title}
				</a>
			</li>
		{/each}
	</ul>

	{#if headings.length > 3}
		<a href="/docs/{slug}" class="to-top">
			<ArrowUp size={13} strokeWidth={2} aria-hidden="true" />
			Back to top
		</a>
	{/if}
</div>

<style>
	.toc-root {
		font-size: var(--text-support);
	}

	.label {
		margin-bottom: 0.875rem;
	}

	.disclosure {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 0.75rem;
		min-height: 44px;
		padding: 0.625rem 0.875rem;
		font-family: inherit;
		text-align: left;
		color: color-mix(in srgb, var(--color-content) 70%, transparent);
		background-color: var(--color-base-200);
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.disclosure:hover {
		color: var(--color-content);
		border-color: var(--color-border-strong);
	}

	.chevron {
		flex: none;
		color: color-mix(in srgb, var(--color-content) 60%, transparent);
		transition: transform 150ms ease;
	}

	.chevron[data-open='true'] {
		transform: rotate(180deg);
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.link {
		display: block;
		padding: 0.3125rem 0 0.3125rem 0.75rem;
		border-left: 2px solid var(--color-base-300);
		color: color-mix(in srgb, var(--color-content) 62%, transparent);
		text-decoration: none;
		line-height: 1.45;
		transition:
			color 150ms ease,
			border-color 150ms ease;
	}

	.link[data-depth='3'] {
		padding-left: 1.5rem;
	}

	.link:hover {
		color: var(--color-content);
	}

	/* The current section. A left rule, because hue alone would not carry it for
	 * a reader who cannot separate teal from grey. */
	.link[data-active='true'] {
		color: var(--color-primary);
		border-left-color: var(--color-primary);
	}

	.to-top {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin-top: 1.25rem;
		padding: 0.375rem 0;
		font-size: var(--text-small);
		color: color-mix(in srgb, var(--color-content) 60%, transparent);
		text-decoration: none;
	}

	.to-top:hover {
		color: var(--color-content);
	}

	@media (prefers-reduced-motion: reduce) {
		.chevron,
		.link {
			transition: none;
		}
	}
</style>