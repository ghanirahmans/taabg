<script lang="ts">
	import { TRANSCRIPTS } from '#lib/content/transcript';
	import type { LogLevel } from '#lib/types/docs';

	interface Props {
		/** Hide the honesty caption when the band sits inside an already-labelled section. */
		showCaption?: boolean;
	}

	let { showCaption = true }: Props = $props();

	let active = $state(TRANSCRIPTS[0].id);

	/**
	 * Hue maps to level, never to decoration: this is the DESIGN.md semantic ramp,
	 * so INFO stays muted and only WARN and ERROR earn a colour.
	 */
	const levelClass: Record<LogLevel, string> = {
		INFO: 'text-content',
		DEBUG: 'text-content-muted',
		WARN: 'text-warning',
		ERROR: 'text-error'
	};
</script>

<div class="codeblock">
	<div class="codeblock-bar">
		<div role="tablist" aria-label="Log scenarios" class="tabs">
			{#each TRANSCRIPTS as transcript (transcript.id)}
				<button
					type="button"
					role="tab"
					id="tab-{transcript.id}"
					aria-selected={active === transcript.id}
					aria-controls="panel-{transcript.id}"
					tabindex={active === transcript.id ? 0 : -1}
					class="tab"
					data-active={active === transcript.id}
					onclick={() => (active = transcript.id)}
					onkeydown={(event) => {
						if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
						event.preventDefault();
						const at = TRANSCRIPTS.findIndex((t) => t.id === active);
						const step = event.key === 'ArrowRight' ? 1 : -1;
						const next = (at + step + TRANSCRIPTS.length) % TRANSCRIPTS.length;
						active = TRANSCRIPTS[next].id;
						document.getElementById(`tab-${TRANSCRIPTS[next].id}`)?.focus();
					}}
				>
					{transcript.id === 'vpn' ? 'VPN drop' : transcript.id.toUpperCase()}
				</button>
			{/each}
		</div>
		<!--
			The format label, not a source citation. This said
			`internal/utils/logger.go`, which pointed a reader at a file in a private
			repository while sitting in the most prominent position in the component.
			The format is the claim worth making, and a reader can check it by running
			the tool.
		-->
		<span class="codeblock-lang shrink-0">console output</span>
	</div>

	<!--
		Every panel is rendered and the inactive ones are hidden, rather than only
		rendering the active one. That is what the WAI-ARIA tabs pattern asks for,
		and it fixes a concrete defect: an inactive tab's `aria-controls` pointed at a
		panel that was not in the DOM at all.
	-->
	{#each TRANSCRIPTS as transcript (transcript.id)}
		<div
			id="panel-{transcript.id}"
			role="tabpanel"
			aria-labelledby="tab-{transcript.id}"
			tabindex="0"
			class="body"
			hidden={active !== transcript.id}
		>
			<p class="prompt">
				<span class="micro-label">You send</span>
				<code>{transcript.prompt}</code>
			</p>

			<ol class="log">
				{#each transcript.lines as line, i (i)}
					<li>
						<span class="log-time">[{line.time}]</span>
						<span class="log-level {levelClass[line.level]}">[{line.level}]</span>
						<span class="log-trace">[{line.trace}]</span>
						<span class="log-component">[{line.component}]</span>
						<span class="log-message">{line.message}</span>
					</li>
				{/each}
			</ol>

			{#if showCaption}
				<p class="caption">{transcript.caption}</p>
			{/if}
		</div>
	{/each}
</div>

<style>
	.tabs {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.tab {
		font-family: var(--font-sans);
		font-size: var(--text-small);
		line-height: 1.375rem;
		/*
		 * 44px at every width, not only below 768px. These three are the only
		 * controls on the landing page that switch between the log transcripts, and
		 * they measured 36px on a tablet in the band above the old breakpoint.
		 */
		min-height: 44px;
		padding: 0.375rem 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		background-color: transparent;
		color: color-mix(in srgb, var(--color-content) 60%, transparent);
		cursor: pointer;
		transition:
			color 120ms ease,
			background-color 120ms ease;
	}

	.tab:hover {
		color: var(--color-content);
		background-color: var(--color-base-300);
	}

	/* The current tab is the one accent in the bar, matching the filled-action rule. */
	.tab[data-active='true'] {
		color: var(--color-primary);
		background-color: color-mix(in srgb, var(--color-primary) 14%, transparent);
	}

	.body {
		padding: 2rem;
	}

	/*
	 * `hidden` has to beat the panel's own display, or the inactive panels stay
	 * on screen. Both selectors carry the same specificity, so source order is
	 * what decides: this comes after `.body`.
	 */
	.body[hidden] {
		display: none;
	}

	.prompt {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1rem;
		margin-bottom: 1.75rem;
	}

	.prompt code {
		font-family: var(--font-mono);
		font-size: var(--text-support);
		color: var(--color-primary);
	}

	.log {
		font-family: var(--font-mono);
		font-size: var(--text-small);
		line-height: 2.125rem;
		list-style: none;
		padding: 0;
	}

	/*
	 * The five log fields are a wrapping flex row, not a grid with `auto` tracks
	 * and not a nowrap line.
	 *
	 * With `white-space: pre` and `min-width: max-content` the longest line needed
	 * 711px in a 603px band, so the transcript scrolled sideways and the timestamp
	 * scrolled out of view with it.
	 *
	 * As a grid it was still wrong: an `auto` track never shrinks, so on a 360px
	 * phone the four fixed fields took 326px of a 232px band and the message column
	 * collapsed to nothing. Flex wrapping degrades honestly at every width, and
	 * below 640px the message takes a line of its own instead of being squeezed.
	 */
	.log li {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem 0.5rem;
		align-items: baseline;
		row-gap: 0.25rem;
	}

	/*
	 * The fixed fields never wrap. The message is excluded on purpose: a bare
	 * `> span` selector scored (0,2,2) and beat `.log-message` at (0,2,0), so the
	 * message inherited nowrap, collapsed under `flex: 1 1 0`, and was then clipped
	 * by the frame's `overflow: hidden`. Naming the fields is both clearer and
	 * immune to that.
	 */
	.log-time,
	.log-level,
	.log-trace,
	.log-component {
		white-space: nowrap;
	}

	/* The message is the only field allowed to wrap internally. */
	.log-message,
	.log li > .log-message {
		flex: 1 1 0;
		min-width: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	/* 50% not 45%: the band sits on base-200, where 45% measures 3.99:1 and a
	 * timestamp is text, not decoration. */
	.log-time,
	.log-trace {
		color: color-mix(in srgb, var(--color-content) 50%, transparent);
	}

	.log-level {
		width: 4.75rem;
		flex: none;
	}

	.log-component {
		color: color-mix(in srgb, var(--color-content) 62%, transparent);
	}

	.log-message {
		color: color-mix(in srgb, var(--color-content) 92%, transparent);
	}

	.caption {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-base-300);
		max-width: 62ch;
		font-size: var(--text-support);
		line-height: 1.65;
		color: color-mix(in srgb, var(--color-content) 68%, transparent);
	}

	@media (max-width: 640px) {
		/*
		 * The four fixed fields do not fit on one line of a phone, so the message
		 * drops to its own full-width line rather than being squeezed to zero.
		 *
		 * The selector has to be as specific as the base rule, not less. The base
		 * message rule compiles to `.log li > .log-message`, which is three classes;
		 * a bare `.log-message` here is two, and higher specificity beats source
		 * order however late the rule is. Written that way this was silently dead at
		 * every width: measured at a 414px viewport the media query matched and the
		 * computed `flex-basis` was still `0px`, so the message was left on the same
		 * line as four fixed fields and measured 4px wide.
		 */
		.log li > .log-message {
			flex-basis: 100%;
		}
	}

	@media (max-width: 480px) {
		/*
		 * At 360px the four fixed fields need about 319px of a 256px band, so they
		 * wrap to a second line. Tighter padding and a narrower level column buy
		 * back the row, which keeps each entry to two lines instead of three.
		 *
		 * These overrides come last on purpose: `.log-level` and `.body` have the
		 * same specificity in both places, so source order decides. Declaring the
		 * media query earlier left them dead.
		 */
		.body {
			padding: 1.25rem;
		}

		.log li {
			gap: 0.25rem 0.375rem;
		}

		.log-level {
			width: 4.25rem;
		}
	}

	@media (max-width: 767px) {
		/* The scenario tabs carry their 44px height in the base rule, at every width. */
	}
</style>
