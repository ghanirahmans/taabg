<script lang="ts">
	import { Check, Copy } from 'lucide-svelte';

	interface Props {
		/** Shiki output from the server-only load. */
		html: string;
		/** Optional right-hand note in the bar, e.g. a filename. */
		note?: string;
		/** Grammar name for the label; `shell` reads better than `text`. */
		lang?: string;
	}

	let { html, note, lang = 'shell' }: Props = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	/** Clipboard write driven by the action below, which owns the DOM lookup. */
	function confirm() {
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1600);
	}

	/**
	 * Copy what the reader can actually see, taken back out of the rendered pre.
	 * @param {HTMLElement} node
	 */
	function copyFrom(node: HTMLElement) {
		const pre = node.querySelector('pre');
		const button = node.querySelector('button');
		if (!pre || !button) return;

		const onClick = async () => {
			try {
				await navigator.clipboard.writeText(pre.textContent ?? '');
				confirm();
			} catch {
				// Clipboard can be blocked by permissions policy. Say so instead of
				// flashing a success state that did not happen.
				button.textContent = 'Copy blocked';
				setTimeout(() => {
					button.textContent = 'Copy';
				}, 1600);
			}
		};

		button.addEventListener('click', onClick);

		return {
			destroy() {
				button.removeEventListener('click', onClick);
				clearTimeout(timer);
			}
		};
	}
</script>

<figure class="codeblock">
	<div class="codeblock-bar">
		<span class="codeblock-lang">{lang}</span>
		{#if note}<span class="codeblock-lang truncate">{note}</span>{/if}
		<button
			type="button"
			class="codeblock-copy"
			data-state={copied ? 'copied' : 'idle'}
			aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
			use:copyFrom
		>
			{#if copied}
				<Check size={13} strokeWidth={2.25} aria-hidden="true" />
				<span>Copied</span>
			{:else}
				<Copy size={13} strokeWidth={2.25} aria-hidden="true" />
				<span>Copy</span>
			{/if}
		</button>
	</div>
	<!-- Shiki output, generated at build time from the snippets in +page.server.ts. -->
	{@html html}
</figure>

<style>
	/* Two labels share the bar; the note yields the space before the button. */
	.codeblock-lang + .codeblock-lang {
		margin-left: auto;
	}
</style>