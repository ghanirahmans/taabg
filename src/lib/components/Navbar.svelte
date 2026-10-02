<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Menu, Search, X } from 'lucide-svelte';
	import { palette } from '#lib/search/palette.svelte';
	import { DOC_ENTRIES } from '#lib/docs/manifest';

	let menuOpen = $state(false);
	let trigger = $state<HTMLButtonElement | null>(null);

	const onHome = $derived(page.url.pathname === '/');

	/** Desktop chips. Anchors point at real sections on `/`, so they work from anywhere. */
	const CHIPS = [
		{ label: 'What it does', href: '/#capabilities', match: '/#capabilities' },
		{ label: 'Request path', href: '/#request-path', match: '/#request-path' },
		{ label: 'Commands', href: '/#commands', match: '/#commands' },
		{ label: 'Documentation', href: '/docs/introduction', match: '/docs' }
	];

	const MOBILE_PRODUCT = [
		{ label: 'What it does', href: '/#capabilities' },
		{ label: 'Request path', href: '/#request-path' },
		{ label: 'Commands', href: '/#commands' }
	];

	const MOBILE_DOCS = DOC_ENTRIES.filter((d) =>
		['introduction', 'installation', 'architecture', 'troubleshooting'].includes(d.slug)
	);

	function isActive(match: string): boolean {
		return match.startsWith('/#') ? onHome && page.url.hash === match : page.url.pathname.startsWith(match);
	}

	function close(returnFocus = false) {
		menuOpen = false;
		if (returnFocus) trigger?.focus();
	}

	// Ctrl+K opens search from anywhere, and the palette itself handles Escape.
	$effect(() => {
		const onKey = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault();
				palette.toggle();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	// Dropdown behaves like a modal surface: scroll locked, page content inert,
	// focus moved in on open and back to the trigger on close.
	$effect(() => {
		const main = document.querySelector('main');
		if (!main) return;

		if (menuOpen) {
			const width = window.innerWidth - document.documentElement.clientWidth;
			document.body.style.overflow = 'hidden';
			if (width > 0) document.body.style.paddingRight = `${width}px`;
			main.setAttribute('inert', '');
			document.getElementById('mobile-menu-first')?.focus();
		} else {
			document.body.style.overflow = '';
			document.body.style.paddingRight = '';
			main.removeAttribute('inert');
		}

		return () => {
			document.body.style.overflow = '';
			document.body.style.paddingRight = '';
			main.removeAttribute('inert');
		};
	});

	function onMenuKey(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close(true);
			return;
		}
		if (event.key !== 'Tab') return;

		// Contain focus inside the dropdown while it is open.
		const panel = document.querySelector<HTMLElement>('#mobile-menu');
		if (!panel) return;
		const focusable = panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

<header class="site-header">
	<div class="shell flex items-center gap-4">
		<a href="/" class="brand" aria-label="taabg home">
			<img src="/taabg-logo.png" alt="" width="22" height="22" class="brand-mark" />
			<span class="font-semibold tracking-tight">taabg</span>
		</a>

		<!-- Chips only exist at the full four-zone width; below 1280px they collapse into the dropdown. -->
		<nav aria-label="Primary" class="hidden min-w-0 flex-1 items-center gap-1 xl:flex">
			{#each CHIPS as chip (chip.href)}
				<a href={chip.href} class="chip" aria-current={isActive(chip.match) ? 'page' : undefined}>
					{chip.label}
				</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2 xl:ml-0">
			<button
				type="button"
				class="search-trigger"
				onclick={() => palette.show()}
				aria-label="Search documentation"
			>
				<Search size={14} strokeWidth={2} aria-hidden="true" />
				<span class="hidden sm:inline">Search docs</span>
				<kbd class="kbd hidden md:inline">Ctrl K</kbd>
			</button>

			<button
				bind:this={trigger}
				type="button"
				class="menu-trigger xl:hidden"
				aria-expanded={menuOpen}
				aria-controls="mobile-menu"
				aria-label={menuOpen ? 'Close menu' : 'Open menu'}
				onclick={() => (menuOpen = !menuOpen)}
			>
				{#if menuOpen}
					<X size={18} strokeWidth={2} aria-hidden="true" />
				{:else}
					<Menu size={18} strokeWidth={2} aria-hidden="true" />
				{/if}
			</button>
		</div>
	</div>

	{#if menuOpen}
		<!-- Scrim sits below the sticky header so the close control stays reachable (DESIGN.md). -->
		<button
			type="button"
			class="scrim"
			tabindex="-1"
			aria-hidden="true"
			onclick={() => close(false)}
		></button>
		<div
			id="mobile-menu"
			class="mobile-menu xl:hidden"
			role="dialog"
			aria-label="Site menu"
			aria-modal="true"
			tabindex="-1"
			onkeydown={onMenuKey}
		>
			<div class="group">
				<p class="micro-label group-label">Product</p>
				<div class="flex flex-col gap-1">
					{#each MOBILE_PRODUCT as item, i (item.href)}
						<a
							id={i === 0 ? 'mobile-menu-first' : undefined}
							href={item.href}
							class="menu-row"
							onclick={() => close(false)}
						>
							{item.label}
						</a>
					{/each}
				</div>
			</div>

			<div class="group">
				<p class="micro-label group-label">Documentation</p>
				<div class="flex flex-col gap-1">
					{#each MOBILE_DOCS as doc (doc.slug)}
						<a
							href="/docs/{doc.slug}"
							class="menu-row"
							aria-current={page.url.pathname === `/docs/${doc.slug}` ? 'page' : undefined}
							onclick={() => close(false)}
						>
							{doc.title}
						</a>
					{/each}
					<a href="/docs" class="menu-row" onclick={() => close(false)}>All documentation</a>
				</div>
			</div>

			<div class="group">
				<p class="micro-label group-label">Actions</p>
				<button
					type="button"
					class="menu-row justify-start"
					onclick={() => {
						close(false);
						palette.show();
					}}
				>
					<Search size={14} strokeWidth={2} aria-hidden="true" />
					Search docs
				</button>
			</div>
		</div>
	{/if}
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 30;
		/* The single permitted blur in the whole design (DESIGN.md locks). */
		backdrop-filter: blur(8px);
		background-color: color-mix(in srgb, var(--color-base-100) 85%, transparent);
		border-bottom: 1px solid var(--color-base-300);
	}

	.shell {
		height: var(--spacing-header);
		max-width: var(--shell-max);
		margin: 0 auto;
		padding: 0 var(--gutter);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex: none;
		color: var(--color-content);
		text-decoration: none;
		font-size: var(--text-lead);
	}

	/* The shipped mark is a PNG on white, so it sits on a white tile rather than
	 * pretending it has a transparent background. */
	.brand-mark {
		border-radius: var(--radius-sm);
		background-color: #ffffff;
		padding: 1px;
		flex: none;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		height: 2.25rem;
		padding: 0 0.875rem;
		border-radius: var(--radius-sm);
		font-size: var(--text-body);
		color: color-mix(in srgb, var(--color-content) 75%, transparent);
		text-decoration: none;
		transition:
			color 120ms ease,
			background-color 120ms ease;
	}

	.chip:hover {
		color: var(--color-content);
		background-color: var(--color-base-200);
	}

	.chip[aria-current='page'] {
		color: var(--color-primary);
		background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}

	.search-trigger,
	.menu-trigger {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		height: 2.25rem;
		padding: 0 0.75rem;
		font-family: inherit;
		font-size: var(--text-support);
		color: color-mix(in srgb, var(--color-content) 70%, transparent);
		background-color: transparent;
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition:
			color 120ms ease,
			border-color 120ms ease;
	}

	/* Control boundary, so it uses the 3:1 border rather than a hairline. */
	.search-trigger,
	.menu-trigger {
		border-color: var(--color-border-strong);
	}

	.search-trigger:hover,
	.menu-trigger:hover {
		color: var(--color-content);
		border-color: var(--color-content-muted);
	}

	.menu-trigger {
		width: 2.25rem;
		justify-content: center;
		padding: 0;
	}

	.kbd {
		font-family: var(--font-mono);
		font-size: var(--text-small);
		padding: 0.125rem 0.375rem;
		border: 1px solid var(--color-base-300);
		border-radius: var(--radius-xs);
		color: color-mix(in srgb, var(--color-content) 55%, transparent);
	}

	.scrim {
		position: fixed;
		inset: var(--spacing-header) 0 0 0;
		background-color: rgb(0 0 0 / 0.55);
		border: 0;
		z-index: 25;
		cursor: default;
	}

	.mobile-menu {
		position: absolute;
		top: var(--spacing-header);
		left: 0;
		right: 0;
		z-index: 26;
		background-color: var(--color-base-100);
		border-bottom: 1px solid var(--color-base-300);
		padding: 0.25rem 0 1rem;
		max-height: calc(100dvh - var(--spacing-header));
		overflow-y: auto;
		box-shadow: 0 12px 24px rgb(0 0 0 / 0.35);
	}

	.group-label {
		padding: 1rem 2rem 0.5rem;
	}

	/* One hairline above each group after the first, so ten rows do not read as one list. */
	.group + .group {
		border-top: 1px solid var(--color-base-300);
		margin-top: 0.25rem;
		padding-top: 0.25rem;
	}

	.menu-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		/* Rows are phone navigation, so they take the base size, not the chip size. */
		font-size: var(--text-body);
		color: color-mix(in srgb, var(--color-content) 80%, transparent);
		text-decoration: none;
		background-color: transparent;
		border: 0;
		border-radius: var(--radius-sm);
		padding: 0 2rem;
		height: 2.5rem;
		cursor: pointer;
		text-align: left;
	}

	.menu-row:hover {
		color: var(--color-content);
		background-color: var(--color-base-200);
	}

	.menu-row[aria-current='page'] {
		color: var(--color-primary);
	}

	@media (max-width: 1023px) {
		.shell {
			padding: 0 1.25rem;
		}

		.group-label,
		.menu-row {
			padding-left: 1.25rem;
			padding-right: 1.25rem;
		}
	}

	@media (max-width: 767px) {
		.search-trigger,
		.menu-trigger {
			height: 44px;
		}

		.menu-trigger {
			width: 44px;
		}

		/* Rows and tabs follow the 44px touch rule. */
		.menu-row {
			height: 44px;
		}
	}
</style>