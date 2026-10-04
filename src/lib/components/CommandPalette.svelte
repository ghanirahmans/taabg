<script lang="ts">
	import { goto } from '$app/navigation';
	import { Search } from 'lucide-svelte';
	import { palette } from '#lib/search/palette.svelte';
	import { queryIndex, excerptFor, type DocIndex } from '#lib/docs/search';

	interface Props {
		/** Built in the docs layout from the markdown sources. */
		index: DocIndex;
	}

	let { index }: Props = $props();

	let query = $state('');
	let activeIndex = $state(0);
	let input = $state<HTMLInputElement | null>(null);
	let panel = $state<HTMLElement | null>(null);
	let dialog = $state<HTMLElement | null>(null);

	/**
	 * Where focus was before the dialog opened.
	 *
	 * Escape and the scrim both close the palette, and when the dialog unmounts the
	 * browser drops focus to `<body>`. Measured after closing: focus was nowhere
	 * near the trigger. A keyboard user who opens search, finds nothing, and
	 * dismisses it ends up back at the top of the document with no idea where they
	 * were, which is most of what makes a search feel clumsy.
	 *
	 * Deliberately a plain variable, not `$state`. The effect below both reads and
	 * writes it, and reactive state read inside an effect is a dependency: making it
	 * reactive meant the effect invalidated itself on every write, which tore the
	 * dialog down the moment it opened. Nothing needs to render from this value.
	 */
	let opener: HTMLElement | null = null;

	const hits = $derived(queryIndex(index, query));

	// A shorter result list must not leave the highlight pointing past the end.
	$effect(() => {
		if (activeIndex > hits.length - 1) activeIndex = 0;
	});

	$effect(() => {
		if (!palette.open) return;

		// Read the active element before anything moves, and only once per open.
		if (!opener) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

		query = '';
		activeIndex = 0;

		/*
		 * Take the rest of the page out of the tab order while the dialog is open.
		 *
		 * The dialog declared `aria-modal="true"`, which tells assistive tech to
		 * ignore the background but does nothing to the keyboard. Measured with the
		 * palette open: 9 focusable elements inside the dialog and 65 in the document,
		 * so Tab walked out into the page behind it.
		 *
		 * `inert` is used rather than a hand-rolled Tab handler because the browser
		 * then excludes the background from the tab order by itself, and this has to
		 * hold for pointer, keyboard and assistive tech alike.
		 */
		const background = document.querySelectorAll<HTMLElement>('.site-header, main, footer, a[href="#main"]');
		const marked: HTMLElement[] = [];
		for (const el of background) {
			if (!el.hasAttribute('inert')) {
				el.setAttribute('inert', '');
				marked.push(el);
			}
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		// The dialog is opened by a click or a shortcut, so the next frame is the
		// first moment focus is allowed to move.
		//
		// `requestAnimationFrame` alone is not enough: it never fires in a tab the
		// user has not looked at, so a shortcut pressed from a background tab would
		// open the palette with the field still unfocused. The timeout covers it.
		const frame = requestAnimationFrame(() => input?.focus());
		const timer = setTimeout(() => input?.focus(), 60);

		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(timer);

			/*
			 * Release `inert` before moving focus, in this order and in one effect.
			 *
			 * Split across two effects the cleanup order decides the outcome, and it
			 * decided the wrong way: the focus restore ran while the header was still
			 * inert, and `focus()` on an inert element does nothing at all. Measured:
			 * focus landed on `<body>`. Doing both here makes the sequence explicit
			 * instead of depending on declaration order.
			 */
			for (const el of marked) el.removeAttribute('inert');
			document.body.style.overflow = previousOverflow;

			const back = opener;
			opener = null;
			// Deferred by one task, so the dialog's own `{#if}` has left the DOM first.
			setTimeout(() => {
				const target =
					back && back.isConnected
						? back
						: // The opener went away, usually because the page navigated. The
							// search button is on every route, so it is the safe place to land.
							document.querySelector<HTMLElement>('.search-trigger');
				target?.focus();
			}, 0);
		};
	});

	/**
	 * Keep Tab inside the dialog.
	 *
	 * `inert` removes the background, but the browser chrome is still reachable, and
	 * shifting out of the first control into the address bar and back in lands on the
	 * page behind. Wrapping at both ends keeps the dialog a closed loop.
	 */
	function trapTab(event: KeyboardEvent) {
		if (event.key !== 'Tab' || !dialog) return;
		const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href], button, input, [tabindex]:not([tabindex="-1"])')]
			.filter((el) => el.getBoundingClientRect().height > 0);
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	async function choose(slug: string, anchor?: string) {
		palette.hide();
		await goto(anchor ? `/docs/${slug}#${anchor}` : `/docs/${slug}`);
	}

	function onKeydown(event: KeyboardEvent) {
		trapTab(event);

		if (event.key === 'Escape') {
			event.preventDefault();
			palette.hide();
			return;
		}
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const step = event.key === 'ArrowDown' ? 1 : -1;
			activeIndex = (activeIndex + step + hits.length) % hits.length;
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			const hit = hits[activeIndex];
			if (hit) choose(hit.slug, hit.anchor);
		}
	}
</script>

{#if palette.open}
	<button class="scrim" type="button" tabindex="-1" aria-hidden="true" onclick={() => palette.hide()}></button>

	<div
		bind:this={dialog}
		class="wrap"
		role="dialog"
		aria-modal="true"
		aria-label="Search documentation"
		tabindex="-1"
		onkeydown={onKeydown}
	>
		<div class="panel">
			<div class="field">
				<Search size={15} strokeWidth={2} aria-hidden="true" class="shrink-0 text-content-muted" />
				<!--
					The field carries an explicit name.

					It had only a placeholder, which is not an accessible name: it
					disappears the moment someone types and it is skipped by several
					screen readers. Nothing else labelled it, because the dialog's own
					`aria-label` names the dialog, not the control inside it.

					Every audit missed this. The palette is closed when the page loads,
					so Lighthouse never saw the field, and the static checks read the
					built HTML where the input is present but the failure only appears
					once the dialog is open.
				-->
				<!-- svelte-ignore a11y_autofocus -->
				<input
					bind:this={input}
					bind:value={query}
					type="search"
					role="combobox"
					aria-label="Search pages and headings"
					aria-expanded="true"
					aria-controls="palette-results"
					aria-activedescendant={hits[activeIndex] ? `hit-${activeIndex}` : undefined}
					autocomplete="off"
					spellcheck="false"
					placeholder="Search pages and headings"
					class="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-content-muted"
				/>
				<kbd class="kbd" aria-hidden="true">Esc</kbd>
			</div>

			<div bind:this={panel} id="palette-results" role="listbox" aria-label="Results" class="results">
				{#if hits.length === 0}
					<!-- Empty state: say what happened and what to do next (R-27, R-38). -->
					<div class="px-5 py-12 text-center">
						<p class="text-[0.9375rem] text-content">Nothing matches &ldquo;{query}&rdquo;</p>
						<p class="mt-2 text-[0.8125rem] leading-relaxed text-content-muted">
							Try a portal name such as Gladius, or a threshold such as fuzzy.
						</p>
					</div>
				{:else}
					{#each hits as hit, i (hit.slug + hit.title + (hit.anchor ?? ''))}
						<button
							type="button"
							id="hit-{i}"
							role="option"
							aria-selected={i === activeIndex}
							class="hit"
							data-active={i === activeIndex}
							onmouseenter={() => (activeIndex = i)}
							onclick={() => choose(hit.slug, hit.anchor)}
						>
							<span class="flex items-baseline justify-between gap-4">
								<span class="text-[0.9375rem]">
									{hit.title}{#if hit.anchor}<span class="text-content-muted">: {hit.excerpt}</span>{/if}
								</span>
								<span class="micro-label shrink-0">{hit.section}</span>
							</span>
							{#if !hit.anchor}
								<span class="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-[0.8125rem] leading-relaxed text-content-muted">
									{#if hit.fromCode}
										<!-- The term lives in a code block: show the command, monospaced,
											so the result is something the reader can act on directly. -->
										<code class="font-mono text-primary">{hit.excerpt}</code>
									{:else}
										{excerptFor(index, hit, query)}
									{/if}
								</span>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<div class="foot">
				<span><kbd class="kbd">Up</kbd><kbd class="kbd">Down</kbd> move</span>
				<span><kbd class="kbd">Enter</kbd> open</span>
				<span class="ml-auto">{hits.length} of {index.length} pages</span>
			</div>
		</div>
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		background-color: rgb(0 0 0 / 0.6);
		border: 0;
		z-index: 40;
		cursor: default;
	}

	.wrap {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		justify-content: center;
		padding: 7rem 1.25rem 1.25rem;
		pointer-events: none;
	}

	.panel {
		pointer-events: auto;
		width: 100%;
		max-width: 38rem;
		max-height: min(34rem, calc(100dvh - 9rem));
		display: flex;
		flex-direction: column;
		background-color: var(--color-base-100);
		border: 1px solid var(--color-base-400);
		border-radius: var(--radius-md);
		overflow: hidden;
		/* The one elevation shadow in the design, on the only overlay surface. */
		box-shadow: 0 16px 48px rgb(0 0 0 / 0.5);
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-base-300);
	}

	.results {
		overflow-y: auto;
		padding: 0.5rem;
	}

	.hit {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.75rem 0.875rem;
		border: 0;
		border-radius: var(--radius-sm);
		background-color: transparent;
		cursor: pointer;
	}

	.hit[data-active='true'] {
		background-color: var(--color-base-200);
	}

	.foot {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 0.75rem 1.25rem;
		border-top: 1px solid var(--color-base-300);
		background-color: var(--color-base-200);
		font-size: var(--text-small);
		color: color-mix(in srgb, var(--color-content) 60%, transparent);
	}

	.kbd {
		font-family: var(--font-mono);
		font-size: var(--text-micro);
		padding: 0.0625rem 0.25rem;
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-xs);
		background-color: var(--color-base-100);
	}

	.kbd + .kbd {
		margin-left: 0.125rem;
	}

	@media (max-width: 767px) {
		.wrap {
			padding: 1rem;
			align-items: flex-start;
		}
	}
</style>