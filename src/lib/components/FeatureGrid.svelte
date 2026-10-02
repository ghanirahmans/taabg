<script lang="ts">
	import { GUARDRAILS } from '#lib/content/capabilities';
</script>

<!--
	Uniform treatment is deliberate here. These five rules are a homogeneous list
	with no hierarchy between them, so giving one of them more weight would imply
	a ranking that does not exist. The source ADR leads each one because the claim
	is only interesting if it is traceable.
-->
<ul class="rules">
	{#each GUARDRAILS as guardrail (guardrail.rule)}
		<li>
			<span class="rule-source">{guardrail.source}</span>
			<p class="rule-text">{guardrail.rule}</p>
		</li>
	{/each}
</ul>

<style>
	/* Two columns, not three. Five items across three columns leaves a row of two
	 * and a hole, and the previous build spent a card border on each one. */
	.rules {
		display: grid;
		list-style: none;
		padding: 0;
		margin: 0;
		border-top: 1px solid var(--color-base-300);
	}

	@media (min-width: 768px) {
		.rules {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: 5rem;
		}
	}

	.rules li {
		padding: 2.5rem 0;
		border-bottom: 1px solid var(--color-base-300);
	}

	.rule-source {
		font-family: var(--font-mono);
		font-size: var(--text-micro);
		letter-spacing: 0.04em;
		color: var(--color-primary);
	}

	.rule-text {
		margin-top: 0.875rem;
		max-width: 46ch;
		font-size: var(--text-body);
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-content) 85%, transparent);
	}
</style>
