<script lang="ts">
	import { page } from '$app/state';
	import { DOC_SECTIONS } from '#lib/docs/manifest';

	/**
	 * The documentation tree, as a disclosure for the widths where the sidebar rail
	 * is hidden.
	 *
	 * Below 1024px the rail is `display: none`, so the only route between sibling
	 * pages was the site menu: open it, scroll past two link groups, find the page.
	 * Measured at a 912px viewport, that is the whole navigation story for a
	 * tablet reader, and it is three actions to do something the desktop rail does
	 * at a glance.
	 *
	 * This sits beside "On this page" in the same sticky panel, so one control now
	 * carries both directions of movement: within the page, and between pages. Two
	 * buttons in one row rather than two stacked, because the panel is sticky and
	 * vertical space is the scarce resource on a phone.
	 */
	let open = $state(false);

	const current = $derived(page.params.slug);
</script>

<div class="page-nav">
	<button
		type="button"
		class="disclosure"
		aria-expanded={open}
		aria-controls="page-list"
		onclick={() => (open = !open)}
	>
		<span class="micro-label">{current ?? 'All pages'}</span>
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

	<ul id="page-list" class="list" hidden={!open}>
		{#each DOC_SECTIONS as section (section.title)}
			<li>
				<p class="micro-label section">{section.title}</p>
				<ul>
					{#each section.items as item (item.slug)}
						<li>
							<a
								href="/docs/{item.slug}"
								class="link"
								aria-current={current === item.slug ? 'page' : undefined}
							>
								{item.title}
							</a>
						</li>
					{/each}
				</ul>
			</li>
		{/each}
	</ul>
</div>

<style>
	.disclosure {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		gap: 0.5rem;
		min-height: 44px;
		padding: 0.625rem 0.75rem;
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

	/*
	 * The button names the page you are on, so it doubles as a "where am I"
	 * indicator. That is why it takes the current slug rather than a static word.
	 */
	.disclosure :global(.micro-label) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		margin: 0.5rem 0 0;
		padding: 0;
		max-height: 60dvh;
		overflow-y: auto;
	}

	.section {
		padding: 0.5rem 0.75rem 0.25rem;
	}

	.link {
		display: block;
		padding: 0.4375rem 0.75rem;
		border-left: 2px solid transparent;
		font-size: var(--text-support);
		color: color-mix(in srgb, var(--color-content) 75%, transparent);
		text-decoration: none;
	}

	.link:hover {
		color: var(--color-content);
		background-color: var(--color-base-200);
	}

	/* The same three cues the sidebar uses: hue, a rule, and a wash. */
	.link[aria-current='page'] {
		color: var(--color-primary);
		border-left-color: var(--color-primary);
		background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	@media (prefers-reduced-motion: reduce) {
		.chevron {
			transition: none;
		}
	}
</style>