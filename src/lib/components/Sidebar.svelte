<script lang="ts">
	import { page } from '$app/state';
	import { DOC_SECTIONS } from '#lib/docs/manifest';

	interface Props {
		/** Called after a link is chosen, so a mobile drawer can close itself. */
		onNavigate?: () => void;
	}

	let { onNavigate }: Props = $props();

	const current = $derived(page.params.slug);
</script>

<nav aria-label="Documentation" class="sidebar">
	{#each DOC_SECTIONS as section (section.title)}
		<div class="mb-8">
			<p class="micro-label mb-3 px-3">{section.title}</p>
			<ul class="space-y-1">
				{#each section.items as item (item.slug)}
					<li>
						<a
							href="/docs/{item.slug}"
							class="side-link"
							aria-current={current === item.slug ? 'page' : undefined}
							onclick={() => onNavigate?.()}
						>
							{item.title}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>

<style>
	.sidebar {
		font-size: var(--text-body);
	}

	.side-link {
		display: block;
		padding: 0.5rem 0.875rem;
		border-radius: var(--radius-sm);
		/* A left rule is a state marker here, not decoration: it says where you are. */
		border-left: 2px solid transparent;
		color: color-mix(in srgb, var(--color-content) 70%, transparent);
		text-decoration: none;
		transition:
			color 120ms ease,
			background-color 120ms ease;
	}

	.side-link:hover {
		color: var(--color-content);
		background-color: var(--color-base-200);
	}

	.side-link[aria-current='page'] {
		color: var(--color-primary);
		border-left-color: var(--color-primary);
		background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}
</style>