<script lang="ts">
	import { GUARDRAILS } from '#lib/content/capabilities';
</script>

<!--
	Uniform treatment is deliberate here. These five rules are a homogeneous list
	with no hierarchy between them, so giving one of them more weight would imply
	a ranking that does not exist.

	Each rule leads with the failure it prevents rather than a citation. The rules
	used to carry a design record number as their heading, which was a reference to
	a file in a private repository: unreadable to a visitor, and no more convincing
	than the rule itself. The reason is the part that makes a rule worth believing.
-->
<ul class="rules">
	{#each GUARDRAILS as guardrail (guardrail.rule)}
		<li>
			<p class="rule-text">{guardrail.rule}</p>
			<p class="rule-why">{guardrail.why}</p>
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

	.rule-text {
		max-width: 46ch;
		font-size: var(--text-body);
		line-height: 1.6;
		color: color-mix(in srgb, var(--color-content) 85%, transparent);
	}

	/*
	 * The reason, one tier quieter and in the accent. It is subordinate to the rule
	 * above it, and a hairline on the left separates the two without spending a
	 * second block of spacing.
	 */
	.rule-why {
		margin-top: 1.25rem;
		padding-left: 1rem;
		max-width: 42ch;
		border-left: 1px solid var(--color-base-300);
		font-size: var(--text-small);
		line-height: 1.6;
		color: var(--color-primary);
	}
</style>
