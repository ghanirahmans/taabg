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
		{DOC_ENTRIES.length} pages, grouped the way you would look them up. Every page is self contained: it
		names the settings, the commands and the numbers you need, so none of it depends on access to the
		bot's own repository.
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
							<!--
								What the page leaves the reader able to do. This used to be the
								path of the repository file the page was written from, which
								was unreadable advice to anyone outside the organisation and
								pointed at nothing they could open.
							-->
							<span class="outcome shrink-0">{entry.outcome}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/each}

<style>
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 22rem;
		gap: 1.5rem 3rem;
		align-items: start;
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

	/*
	 * The outcome column is prose, so it is set as prose: a readable measure, a
	 * relaxed leading, and a colour that clears AA over a base-200 panel. It used
	 * to be a monospace file path, which is what made this row feel like an
	 * index into a codebase rather than a list of things to read.
	 */
	.outcome {
		max-width: 34ch;
		padding-top: 0.125rem;
		font-size: var(--text-small);
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-content) 62%, transparent);
	}

	@media (max-width: 767px) {
		.row {
			grid-template-columns: minmax(0, 1fr);
			gap: 0.75rem;
		}

		.outcome {
			max-width: 46ch;
			padding-top: 0.5rem;
			border-top: 1px solid var(--color-base-300);
		}
	}
</style>