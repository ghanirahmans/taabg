<script lang="ts">
	import { DOC_ENTRIES, DOC_SECTIONS } from '#lib/docs/manifest';
</script>

<svelte:head>
	<title>Documentation, taabg</title>
	<meta
		name="description"
		content="Installation, architecture, the feature catalog, bot commands and troubleshooting for taabg."
	/>
</svelte:head>

<header class="mb-16">
	<p class="micro-label">Documentation</p>
	<h1 class="mt-3 text-[1.75rem] leading-tight lg:text-[2.25rem]">
		Everything the bot does, and how to run it
	</h1>
	<p class="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-content-muted">
		{DOC_ENTRIES.length} pages, grouped the way you would look them up. Each one names the file in the
		repository it was written from, so you can check it against the source.
	</p>
</header>

{#each DOC_SECTIONS as section (section.title)}
	<section class="mb-14">
		<h2 class="micro-label mb-5">{section.title}</h2>
		<ul class="space-y-3">
			{#each section.items as item (item.slug)}
				{@const entry = DOC_ENTRIES.find((d) => d.slug === item.slug)}
				<li>
					<a href="/docs/{item.slug}" class="row">
						<span class="min-w-0">
							<span class="block text-[0.9375rem] font-medium">{item.title}</span>
							<span class="mt-1.5 block text-[0.875rem] leading-relaxed text-content-muted">
								{entry?.description}
							</span>
						</span>
						{#if entry}
							<code class="source shrink-0">{entry.source.path}</code>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}

<style>
	.row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1.5rem;
		background-color: var(--color-base-200);
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-md);
		padding: 1.25rem 1.5rem;
		text-decoration: none;
		transition:
			border-color 120ms ease,
			background-color 120ms ease;
	}

	.row:hover {
		border-color: var(--color-base-400);
		background-color: var(--color-base-300);
	}

	.source {
		font-family: var(--font-mono);
		font-size: var(--text-small);
		/* 60% not 50%: the path is the provenance of the page rather than
		 * decoration, and 50% is the quietest tier that still clears AA over a
		 * base-200 panel. 60% leaves headroom at 6.01:1. */
		color: color-mix(in srgb, var(--color-content) 60%, transparent);
		padding-top: 0.25rem;
	}

	@media (max-width: 639px) {
		.row {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>