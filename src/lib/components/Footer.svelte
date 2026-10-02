<script lang="ts">
	import { DOC_ENTRIES } from '#lib/docs/manifest';

	const year = new Date().getFullYear();
</script>

<footer class="border-t border-base-300">
	<div class="shell">
		<div class="grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
			<div>
				<div class="flex items-center gap-2">
					<img src="/taabg-logo.png" alt="" width="20" height="20" class="rounded-[4px] bg-white p-px" />
					<span class="font-semibold tracking-tight">taabg</span>
				</div>
				<p class="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-content-muted">
					A Telegram bot and browser dashboard for Telkom access assurance work. Pure Go, one binary,
					no runtime to install on the machine that runs it.
				</p>
			</div>

			<nav aria-label="Documentation">
				<p class="micro-label mb-4">Documentation</p>
				<ul class="space-y-3">
					{#each DOC_ENTRIES as doc (doc.slug)}
						<li>
							<a href="/docs/{doc.slug}" class="footer-link">{doc.title}</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div>
				<p class="micro-label mb-4">On this machine</p>
				<ul class="space-y-3 text-[0.9375rem] text-content-muted">
					<li><code class="font-mono text-[0.875rem]">taabg.exe</code></li>
					<li><code class="font-mono text-[0.875rem]">~/.taabg/.env</code></li>
					<li><code class="font-mono text-[0.875rem]">bot_YYYY-MM-DD.log</code></li>
				</ul>
			</div>
		</div>

		<!--
			Provenance, not links: these paths live in the Go repository and have no
			public URL, so naming the canonical source beats inventing one.
		-->
		<div class="flex flex-col gap-2 border-t border-base-300 py-8 text-[0.8125rem] leading-relaxed text-content-muted md:flex-row md:items-center md:justify-between">
			<p>
				Written from the repository documentation. Where a page and the repository disagree, the
				repository wins.
			</p>
			<p class="font-mono">{year} taabg</p>
		</div>
	</div>
</footer>

<style>
	.shell {
		max-width: var(--shell-max);
		margin: 0 auto;
		padding: 0 var(--gutter);
	}

	.footer-link {
		font-size: var(--text-body);
		color: color-mix(in srgb, var(--color-content) 80%, transparent);
		text-decoration: none;
	}

	.footer-link:hover {
		color: var(--color-primary);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (max-width: 1023px) {
		.shell {
			padding: 0 1.25rem;
		}
	}
</style>