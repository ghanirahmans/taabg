<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import LogBand from './LogBand.svelte';

	interface Props {
		/** One filled action per view (DESIGN.md), so the hero owns it. */
		primaryHref?: string;
		primaryLabel?: string;
	}

	let { primaryHref = '/docs/introduction', primaryLabel = 'Read the handbook' }: Props = $props();
</script>

<!--
	The hero carries one idea and one piece of evidence. The previous build put a
	headline, seven paragraphs, two buttons and a three-cell stat strip above the
	fold, which left the eye with no single place to land. Numbers moved below the
	fold to the capabilities section, where they sit next to the table that
	justifies them.
-->
<section class="hero">
	<div class="shell">
		<div class="hero-grid">
			<div class="hero-copy">
				<h1>Assurance checks, run from the group chat your team already uses</h1>

				<p class="lead">
					<span class="mono">taabg</span> opens Gladius, ProMan, IBooster, ACSIS and Finpay in one
					Chromium session, runs the check a technician asked for, and posts the result with a
					screenshot back into the group.
				</p>

				<p class="note">
					A field technician gets a cabinet code and has to answer four questions about it. That is
					currently five browser tabs and twenty minutes of copying numbers between systems that do
					not talk to each other. This is the part that automates.
				</p>

				<div class="actions">
					<a href={primaryHref} class="btn-primary">
						{primaryLabel}
						<ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
					</a>
					<a href="/#request-path" class="btn-secondary">See the request path</a>
				</div>
			</div>

			<div class="hero-evidence">
				<LogBand />
			</div>
		</div>
	</div>
</section>

<style>
	.hero {
		padding: 7rem 0 8rem;
	}

	/* 7rem of air above the headline. The previous value put the h1 6rem from the
	 * top of the page, which read as a cramped strip rather than an opening. */
	@media (min-width: 1024px) {
		.hero {
			padding: 9rem 0 10rem;
		}
	}

	.hero-grid {
		display: grid;
		gap: 4rem;
		align-items: start;
	}

	@media (min-width: 1024px) {
		.hero-grid {
			/* The evidence column is wider than the copy column: the log band is
			 * the thing being sold, and the paragraph is what explains it. */
			grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
			gap: 5rem;
		}
	}

	.hero-copy h1 {
		max-width: 15ch;
	}

	.lead {
		margin-top: 2rem;
		max-width: 46ch;
		font-size: var(--text-lead);
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-content) 72%, transparent);
	}

	.mono {
		font-family: var(--font-mono);
		font-size: 0.9375em;
		color: var(--color-content);
	}

	/*
	 * The problem statement, one tier quieter than the lead and separated by a
	 * hairline. It sits below the lead rather than above the headline because the
	 * hero already carries two ideas, and a third block above the fold is what
	 * left the previous build with nowhere for the eye to land.
	 */
	.note {
		margin-top: 1.75rem;
		padding-left: 1.25rem;
		max-width: 44ch;
		border-left: 1px solid var(--color-base-300);
		font-size: var(--text-support);
		line-height: 1.65;
		color: color-mix(in srgb, var(--color-content) 62%, transparent);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-top: 3rem;
	}

	.btn-primary,
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		height: 3rem;
		padding: 0 1.5rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-body);
		font-weight: 500;
		text-decoration: none;
		transition:
			background-color 120ms ease,
			border-color 120ms ease;
	}

	/* Exactly one filled action per view (DESIGN.md locks). */
	.btn-primary {
		background-color: var(--color-primary);
		color: var(--color-primary-content);
		border: 1px solid var(--color-primary);
	}

	.btn-primary:hover {
		background-color: color-mix(in srgb, var(--color-primary) 85%, white);
	}

	.btn-secondary {
		background-color: transparent;
		color: var(--color-content);
		border: 1px solid var(--color-border-strong);
	}

	.btn-secondary:hover {
		border-color: var(--color-content-muted);
		background-color: var(--color-base-200);
	}

	@media (max-width: 1023px) {
		/* 44px touch target. */
		.btn-primary,
		.btn-secondary {
			height: 44px;
		}
	}
</style>
