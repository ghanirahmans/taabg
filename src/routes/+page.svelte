<script lang="ts">
	import CodeBlock from '#lib/components/CodeBlock.svelte';
	import FeatureGrid from '#lib/components/FeatureGrid.svelte';
	import Hero from '#lib/components/Hero.svelte';
	import { DIRECT_COMMANDS, PIPELINE, PORTALS } from '#lib/content/capabilities';
	import { DOC_ENTRIES } from '#lib/docs/manifest';

	let { data } = $props();
</script>

<svelte:head>
	<title>taabg, Telkom access assurance from the group chat</title>
	<meta
		name="description"
		content="taabg runs Gladius, ProMan, IBooster, ACSIS and Finpay checks from Telegram or a browser dashboard, and posts results with a screenshot back to the group. One Go binary, no runtime dependencies."
	/>
</svelte:head>

<Hero />

<!--
	SECTION SHAPES, and why they differ.

	The previous build gave all six sections the same composition: a top border,
	symmetric padding, a heading, a paragraph, then content. Repeated six times
	that reads as one long column rather than six ideas, and it is why the page
	looked cramped. Each section below now takes the shape its content wants:

		portals    full-bleed table, no side padding, numbers up front
		path       stacked steps with a hairline spine, two snippets below
		commands   asymmetric two-column, prose left and a table right
		guardrails a 2x2 block at a deliberately different measure
		docs       narrow single column, the quietest thing on the page
-->

<!-- Portals: the evidence for the headline, so it leads with numbers. -->
<section id="capabilities" class="band">
	<div class="shell">
		<header class="band-head">
			<h2>Five portals, one browser session</h2>
			<p class="standfirst">
				Each portal gets its own concurrency limit, because the reasons differ. ProMan rejects a
				second tab outright, Gladius breaks when its session expires, and IBooster overwrites the
				previous reading when a measurement runs twice. The bot queues work instead of forcing it
				through.
			</p>
		</header>

		<div class="figures">
			<div class="figure">
				<span class="figure-value">5</span>
				<span class="figure-label">portals automated</span>
			</div>
			<div class="figure">
				<span class="figure-value">7</span>
				<span class="figure-label">checks implemented</span>
			</div>
			<div class="figure figure-accent">
				<span class="figure-value">0</span>
				<span class="figure-label">runtime dependencies</span>
			</div>
		</div>

		<div class="table-scroll">
			<table class="data table-wide">
				<caption class="sr-only">
					Portals, the checks each one backs, and the concurrency limit and its reason
				</caption>
				<thead>
					<tr>
						<th scope="col">Portal</th>
						<th scope="col">Used for</th>
						<th scope="col">Checks</th>
						<th scope="col">Sessions</th>
						<th scope="col">Why that limit</th>
					</tr>
				</thead>
				<tbody>
					{#each PORTALS as portal (portal.name)}
						<tr>
							<th scope="row" class="mono">{portal.name}</th>
							<td class="muted">{portal.role}</td>
							<td>
								<span class="tags">
									{#each portal.checks as check (check)}
										<span class="tag">{check}</span>
									{/each}
								</span>
							</td>
							<td class="mono">{portal.limit}</td>
							<td class="muted">{portal.limitReason}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

<!-- Request path: a real sequence, so numbered, and it reads top to bottom. -->
<section id="request-path" class="band">
	<div class="shell">
		<header class="band-head">
			<h2>What happens when someone asks for a check</h2>
			<p class="standfirst">
				The request is read as plain language, not as a command. Anything ambiguous is dropped rather
				than guessed at, which is why the same phrase twice in a minute only runs once.
			</p>
		</header>

		<ol class="steps">
			{#each PIPELINE as stage, i (stage.stage)}
				<li class="step">
					<span class="step-number">{String(i + 1).padStart(2, '0')}</span>
					<div>
						<h3>{stage.stage}</h3>
						<p class="step-package">{stage.package}</p>
						<p class="step-detail">{stage.detail}</p>
					</div>
				</li>
			{/each}
		</ol>

		<div class="snippet-pair">
			<div>
				<p class="micro-label">Ask for a check</p>
				<CodeBlock html={data.snippets.scrape} lang="shell" note="in the group" />
			</div>
			<div>
				<p class="micro-label">Run it as a service</p>
				<CodeBlock html={data.snippets.service} lang="shell" note="PowerShell" />
			</div>
		</div>
	</div>
</section>

<!-- Commands: asymmetric on purpose, because the prose and the table are not
	the same kind of thing and forcing them to match wastes the left column. -->
<section id="commands" class="band">
	<div class="shell">
		<div class="split">
			<div class="split-copy">
				<header class="band-head">
					<h2>Commands exist, but most requests do not need one</h2>
					<p class="standfirst">
						The scraping work stays in natural language, where an operator would phrase it. A short
						catalog of direct replies covers the bot's own housekeeping, so nobody has to remember
						syntax to get an answer.
					</p>
				</header>

				<div class="split-snippet">
					<p class="micro-label">Install and verify</p>
					<CodeBlock html={data.snippets.install} lang="shell" note="first run" />
				</div>
			</div>

			<div class="table-scroll">
				<table class="data table-narrow">
					<caption class="sr-only">Direct-reply commands, their aliases and what they do</caption>
					<thead>
						<tr>
							<th scope="col">Command</th>
							<th scope="col">Also accepted</th>
							<th scope="col">Does</th>
						</tr>
					</thead>
					<tbody>
						{#each DIRECT_COMMANDS as command (command.command)}
							<tr>
								<td class="mono nowrap">{command.command}</td>
								<td class="mono muted wrap-ok">{command.aliases || 'none'}</td>
								<td class="muted">{command.does}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</section>

<!-- Guardrails: the filter is the part worth reading about. -->
<section id="guardrails" class="band">
	<div class="shell">
		<header class="band-head">
			<h2>A bot in a busy group has to know when to shut up</h2>
			<p class="standfirst">
				Ordinary conversation, ticket closing templates and negated requests are all filtered out
				before anything runs. Each rule below is traceable to the decision that introduced it.
			</p>
		</header>
		<FeatureGrid />
	</div>
</section>

<!-- Docs: the quietest section, deliberately narrow, because it is a signpost
	rather than an argument. -->
<section class="band">
	<div class="shell">
		<div class="docs-intro">
			<h2>Documentation</h2>
			<p class="standfirst">
				Seven pages, written from the repository documentation. Press
				<kbd>Ctrl</kbd><kbd>K</kbd> to search them from anywhere on the site.
			</p>
		</div>

		<ul class="doc-list">
			{#each DOC_ENTRIES as doc (doc.slug)}
				<li>
					<a href="/docs/{doc.slug}">
						<span class="doc-section">{doc.section}</span>
						<span class="doc-title">{doc.title}</span>
						<span class="doc-desc">{doc.description}</span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

<style>
	/* `.shell` is a global rule in app.css. Declaring it here would scope it to this
	 * component only, and the hero's copy column would silently lose its measure. */

	/*
	 * One band, one rhythm. Every section gets the same generous vertical pause,
	 * because that pause is the page's breathing room. What differs between
	 * sections is the internal composition above, not the outer padding.
	 */
	.band {
		padding: var(--space-section) 0;
		border-top: 1px solid var(--color-base-300);
	}

	/* Shared heading block. Left aligned, not centred: centring a heading over a
	 * left aligned table is the mismatch that made the old build feel off. */
	.band-head {
		max-width: 60ch;
		margin-bottom: 4rem;
	}

	.standfirst {
		margin-top: 1.5rem;
		font-size: var(--text-lead);
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-content) 68%, transparent);
	}

	kbd {
		display: inline-block;
		margin: 0 0.25rem;
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-xs);
		font-family: var(--font-mono);
		font-size: var(--text-small);
		color: color-mix(in srgb, var(--color-content) 75%, transparent);
	}

	/*
	 * Figures: a titleless strip, values above labels, hairline dividers. The
	 * value is display type, larger than any heading on the page, because a
	 * figure should read as a figure and not as another sentence.
	 */
	.figure-value {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-figure);
		line-height: 3.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-content);
	}
	.figures {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 2rem;
		margin-bottom: 4rem;
		padding-top: 3rem;
		border-top: 1px solid var(--color-base-300);
	}

	.figure {
		padding-right: 2rem;
		border-right: 1px solid var(--color-base-300);
	}

	.figure:last-child {
		padding-right: 0;
		border-right: 0;
	}

	.figure-value {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-figure);
		line-height: 3.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-content);
	}

	kbd {
		display: inline-block;
		margin: 0 0.25rem;
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-xs);
		font-family: var(--font-mono);
		font-size: var(--text-small);
		color: color-mix(in srgb, var(--color-content) 75%, transparent);
	}

	/* The single accent on the page, spent on the claim a lead is checking. */
	.figure-accent .figure-value {
		color: var(--color-primary);
	}

	.figure-label {
		display: block;
		margin-top: 0.5rem;
		font-size: var(--text-small);
		line-height: 1.25rem;
		letter-spacing: 0.02em;
		color: color-mix(in srgb, var(--color-content) 60%, transparent);
	}

	/* Tables sit on a panel surface, inset from the shell so the row rules have
		something to end against. */
	.table-scroll {
		overflow-x: auto;
		background-color: var(--color-base-200);
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-md);
	}

	.data {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-support);
	}

	/*
	 * A table's width floor belongs to the table, not to `.data`. The portals
	 * table spans the full content width and needs 44rem to keep five columns
	 * legible. The commands table sits in the 623px right-hand track of the
	 * asymmetric split, where a 44rem floor overflowed by 81px and produced a
	 * horizontal scrollbar, so it declares a smaller floor and lets the
	 * description column wrap instead.
	 */
	.table-wide {
		min-width: 44rem;
	}

	.table-narrow {
		min-width: 22rem;
	}

	.data th,
	.data td {
		padding: 1.125rem 1.5rem;
		text-align: left;
		vertical-align: top;
	}

	.data thead th {
		font-size: var(--text-micro);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-content) 60%, transparent);
		border-bottom: 1px solid var(--color-base-300);
		white-space: nowrap;
	}

	.data tbody tr + tr th,
	.data tbody tr + tr td {
		border-top: 1px solid var(--color-base-300);
	}

	.data tbody th {
		font-weight: 500;
		white-space: nowrap;
	}

	.mono {
		font-family: var(--font-mono);
		font-size: 0.9375em;
	}

	.muted {
		color: color-mix(in srgb, var(--color-content) 68%, transparent);
	}

	.nowrap {
		white-space: nowrap;
	}

	/*
	 * The aliases column holds comma separated words, so it wraps on the space
	 * rather than forcing the whole table wider than its track.
	 */
	.wrap-ok {
		white-space: normal;
		overflow-wrap: anywhere;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.tag {
		padding: 0.1875rem 0.5rem;
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: var(--text-micro);
		line-height: 1.125rem;
		color: color-mix(in srgb, var(--color-content) 72%, transparent);
		white-space: nowrap;
	}

	/* Steps: a hairline spine on the left, so the sequence reads as one thing. */
	.steps {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--color-base-300);
	}

	.step {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		gap: 2rem;
		padding: 2rem 0;
		border-bottom: 1px solid var(--color-base-300);
	}

	/* 50% not 45%: the step number is text on the page background, where 45%
	 * measures 4.01:1 and falls under AA. */
	.step-number {
		font-family: var(--font-mono);
		font-size: var(--text-small);
		line-height: 1.75rem;
		color: color-mix(in srgb, var(--color-content) 50%, transparent);
	}

	.step-package {
		margin-top: 0.25rem;
		font-family: var(--font-mono);
		font-size: var(--text-small);
		color: var(--color-primary);
	}

	.step-detail {
		margin-top: 0.75rem;
		max-width: 62ch;
		font-size: var(--text-body);
		color: color-mix(in srgb, var(--color-content) 70%, transparent);
	}

	.snippet-pair {
		display: grid;
		gap: 3rem;
		margin-top: 5rem;
	}

	@media (min-width: 1024px) {
		.snippet-pair {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 3.5rem;
		}
	}

	/*
	 * A shell line is roughly 8.4px per character at 14px mono, so a two column
	 * snippet track leaves about 530px of usable width. Anything longer than
	 * ~62 characters scrolls the pre, and a horizontal scrollbar in the middle of a
	 * page reads as a mistake. The snippet comments in +page.server.ts are written
	 * to stay under that, and this is the assertion that keeps them there.
	 */
	.snippet-pair :global(.codeblock) {
		min-width: 0;
	}

	.snippet-pair .micro-label,
	.split-snippet .micro-label {
		margin-bottom: 1rem;
	}

	/* Asymmetric split: the prose gets a narrower track than the table. */
	.split {
		display: grid;
		gap: 4rem;
		align-items: start;
	}

	@media (min-width: 1024px) {
		.split {
			grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
			gap: 5rem;
		}
	}

	.split-snippet {
		margin-top: 3.5rem;
	}

	.docs-intro {
		max-width: 46ch;
		margin-bottom: 3.5rem;
	}

	/* Docs list: rows rather than cards. A grid of boxes here would repeat the
		card pattern three sections earlier and flatten the page. */
	.doc-list {
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--color-base-300);
	}

	.doc-list a {
		display: grid;
		gap: 0.5rem 2rem;
		padding: 2rem 0;
		border-bottom: 1px solid var(--color-base-300);
		text-decoration: none;
		transition: color 120ms ease;
	}

	@media (min-width: 768px) {
		.doc-list a {
			grid-template-columns: 10rem minmax(0, 1fr);
			/* Section label, title, description. */
			grid-template-areas:
				'section title'
				'section desc';
			align-items: baseline;
			column-gap: 3rem;
		}
	}

	.doc-section {
		grid-area: section;
		font-size: var(--text-micro);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--color-content) 55%, transparent);
	}

	.doc-title {
		grid-area: title;
		font-size: var(--text-body);
		font-weight: 500;
		color: var(--color-content);
	}

	.doc-desc {
		grid-area: desc;
		max-width: 62ch;
		font-size: var(--text-support);
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-content) 65%, transparent);
	}

	.doc-list a:hover .doc-title {
		color: var(--color-primary);
	}

	.doc-list a:hover {
		color: var(--color-primary);
	}

	@media (max-width: 1023px) {
		.figures {
			gap: 1.5rem;
		}

		.figure {
			padding-right: 1.5rem;
		}
	}

	@media (max-width: 479px) {
		.figures {
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
		}

		.figure {
			padding: 1.5rem 0;
			border-right: 0;
			border-bottom: 1px solid var(--color-base-300);
		}

		.figure:last-child {
			border-bottom: 0;
		}

		.step {
			grid-template-columns: 2rem minmax(0, 1fr);
			gap: 1rem;
		}
	}
</style>
