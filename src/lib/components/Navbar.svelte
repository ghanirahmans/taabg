<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Menu, Search, X } from 'lucide-svelte';
	import { palette } from '#lib/search/palette.svelte';
	import { DOC_SECTIONS } from '#lib/docs/manifest';

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

	/**
	 * Every doc, grouped the way the sidebar groups them.
	 *
	 * This used to be a hand-picked four: introduction, installation,
	 * architecture, troubleshooting, plus a link to the index for the rest. That
	 * worked while the docs drawer carried the full tree. With the drawer gone this
	 * menu is the only documentation navigation below 1024px, so a partial list
	 * here means three pages a phone reader cannot reach.
	 */
	const MOBILE_DOC_SECTIONS = DOC_SECTIONS;

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

	// The menu is a modal surface: scroll locked, page content inert, focus moved in on
	// open and back to the trigger on close. The header is deliberately left live, so
	// the control that opened the dialog is also the control that closes it.
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

		// Contain focus inside the dialog while it is open.
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
			<!--
				No `aria-label` here. The accessible name is computed from the content, so
				it reads "Search docs Ctrl K", which is exactly the visible text. Giving
				the button a shorter name than it displays fails the label-content-name
				check, because the accessible name has to contain the whole visible
				label. The shortcut appearing in the name is a fair trade: it is the
				same information the sighted reader gets.
			-->
			<button
				type="button"
				class="search-trigger"
				onclick={() => palette.show()}
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
				/*
				 * `aria-controls` is permanent, which is what the ARIA disclosure
				 * pattern asks for. That only works because the panel below is always
				 * in the DOM and hidden when closed, rather than rendered on open. The
				 * earlier version dropped the attribute instead, which left a
				 * disclosure button with nothing to disclose.
				 */
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
</header>

<!--
	The backdrop and the dialog are siblings of the header, not children of it.

	`.site-header` carries `backdrop-filter: blur(8px)`, which is the one blur DESIGN.md
	permits, and `backdrop-filter` makes an element a containing block for its
	`position: fixed` descendants exactly as `transform` does. While both lived inside
	the header, the scrim's containing block was the 65px header box rather than the
	viewport, so `inset: var(--spacing-header) 0 0 0` resolved to a box 1px tall. It
	measured 0px. The backdrop had never dimmed anything and, having no area, could
	never be clicked to dismiss the menu. Moving them out is the fix; the same trap
	would catch the next fixed-position thing added to the header.
-->
<button
	type="button"
	class="scrim xl:hidden"
	tabindex="-1"
	aria-hidden="true"
	hidden={!menuOpen}
	onclick={() => close(false)}
></button>

<!--
	Always in the DOM, hidden when closed. `aria-controls` on the trigger then points at
	something real in every state, which is what the disclosure pattern requires, and
	`hidden` takes the links out of the tab order so the closed menu costs nothing and
	traps no focus.

	The wrapper is transparent to pointer events and the card takes them back, so a
	click anywhere outside the card reaches the scrim underneath. This is the same
	structure the search palette uses, so there is one shape for a dialog on this site.
-->
<div class="menu-wrap xl:hidden" hidden={!menuOpen}>
	<div
		id="mobile-menu"
		class="mobile-menu"
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
			{#each MOBILE_DOC_SECTIONS as group (group.title)}
				<div class="doc-subgroup">
					<p class="micro-label subgroup-label">{group.title}</p>
					<div class="flex flex-col gap-1">
						{#each group.items as doc (doc.slug)}
							<a
								href="/docs/{doc.slug}"
								class="menu-row"
								aria-current={page.url.pathname === `/docs/${doc.slug}` ? 'page' : undefined}
								onclick={() => close(false)}
							>
								{doc.title}
							</a>
						{/each}
					</div>
				</div>
			{/each}
			<a href="/docs" class="menu-row" onclick={() => close(false)}>All documentation</a>
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
</div>

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

	/*
	 * 44px tall, not the 29px it measured at.
	 *
	 * The wordmark's own text sets the height, so the link was exactly as tall as
	 * its cap height and nothing more. It is the way home from every page on the
	 * site, so it gets the same target as the two controls beside it.
	 */
	.brand {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex: none;
		min-height: 44px;
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
		/*
		 * 44px at every width, not only below 768px.
		 *
		 * The menu trigger already made this move. The search button beside it was
		 * left at 36px between 768px and 1280px, which is exactly the width of a
		 * tablet in portrait. Both are header controls reached with the same thumb,
		 * so they should be the same size, and a 36px target on a tablet is the
		 * complaint this started from.
		 */
		height: 44px;
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

	/*
	 * 44px wide, so the icon-only form is a square target.
	 *
	 * Below the `sm` breakpoint the label and the shortcut both hide and the button
	 * collapses to its icon: 14px of glyph plus 0.75rem of padding each side plus
	 * the border measured 40px. The height was already 44px from the base rule, so
	 * the button was a 40 by 44 target beside a 44 by 44 one.
	 */
	.search-trigger {
		min-width: 44px;
		justify-content: center;
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
		/*
		 * 44px, not 36px, and not only below 768px.
		 *
		 * Between 768px and 1280px this button is the entire primary navigation:
		 * every chip is hidden, so "where am I and where can I go" collapses into
		 * this one control. It was 36px next to a 189px search button, which put the
		 * site navigation visibly subordinate to a secondary action that can be
		 * replaced by a keyboard shortcut. On a tablet that is the wrong way round,
		 * and 36px is a small target for a thumb on a 912px-wide screen.
		 */
		width: 44px;
		height: 44px;
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

	/*
	 * The backdrop starts below the header, on purpose. The header carries the brand,
	 * the search trigger and the X, so the dialog can be closed by the control that
	 * opened it and the page keeps a stable top edge while the menu is open.
	 *
	 * z-index 40 and 41 are the search palette's numbers, not an accident of ordering:
	 * the two dialogs on this site share a layer scale so whichever opens last is on
	 * top, and the header is 30.
	 */
	.scrim {
		position: fixed;
		inset: var(--spacing-header) 0 0 0;
		background-color: rgb(0 0 0 / 0.6);
		border: 0;
		z-index: 40;
		cursor: default;
	}

	/*
	 * A transparent full-viewport layer that positions the card.
	 *
	 * `pointer-events: none` is what lets a click outside the card reach the scrim
	 * underneath. Without it this wrapper covers the viewport and swallows every click
	 * that is not on the card, so the scrim becomes unreachable and the only way out is
	 * Escape or the X.
	 */
	.menu-wrap {
		position: fixed;
		inset: 0;
		z-index: 41;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: calc(var(--spacing-header) + 1.5rem) 1.25rem 1.5rem;
		pointer-events: none;
	}

	/*
	 * A centred card, not a full width sheet.
	 *
	 * This used to be `position: absolute` with `left: 0; right: 0` below the header,
	 * which is a dropdown: a 360px wide band of eleven rows hanging off the top of the
	 * page. It read as part of the header rather than as something opened on top of the
	 * page, and the trigger is a 44px square, so the thing it opened was 45 times its
	 * area and began at the opposite end of the screen from the button that opened it.
	 *
	 * Centred by the wrapper, so the card needs no `left: 50%` and no transform. A
	 * transform here would make the card a containing block for anything fixed inside
	 * it, which is the same trap the header's `backdrop-filter` sets two elements up.
	 */
	.mobile-menu {
		pointer-events: auto;
		/*
		 * 30rem is wide enough for the longest row, "Bot Commands", without the heading
		 * above it wrapping, and narrow enough that the card does not sit in the middle
		 * of a wide screen looking abandoned. The wrapper's own 1.25rem padding is what
		 * keeps it off the edges on a phone.
		 */
		width: min(30rem, 100%);
		max-height: 100%;
		overflow-y: auto;
		overscroll-behavior: contain;
		background-color: var(--color-base-100);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		padding: 0.25rem 0 0.5rem;
		box-shadow:
			0 0 0 1px rgb(0 0 0 / 0.2),
			0 18px 40px rgb(0 0 0 / 0.45);
	}

	/*
	 * `hidden` must beat these elements' own `display`, or the closed menu still covers
	 * the page and its links stay in the tab order. `.menu-wrap` is `display: flex` and
	 * covers the viewport whatever size the card is, so this matters more than it did
	 * when the panel was a bar below the header. Both selectors have the same
	 * specificity, so source order is what decides, and this comes after.
	 *
	 * There is no `.mobile-menu[hidden]` rule and there should not be one: `hidden` is on
	 * the wrapper, not the card, and svelte-check reports the unused selector rather than
	 * letting it sit there looking like it does something.
	 */
	.scrim[hidden],
	.menu-wrap[hidden] {
		display: none;
	}

	/*
	 * Internal padding is the card's own padding, 1.25rem, not a bar's edge to edge
	 * inset.
	 *
	 * These were 2rem because the panel used to span the full width and the labels sat
	 * near the screen edge. On a 30rem card that leaves an awkward gutter on a floating
	 * surface. `.subgroup-label` was 2rem unconditionally while a media query dropped
	 * `.group-label` and `.menu-row` to 1.25rem below 1024px, so on a phone the section
	 * heading sat further in than the group heading above it, which is backwards.
	 */
	.group-label {
		padding: 0.875rem 1.25rem 0.375rem;
	}

	/* Section heading inside the Documentation group, one level in from the group
	 * label. Seven doc links under one flat heading read as a single undifferentiated
	 * list, which is why the sidebar groups them and this does too. */
	.subgroup-label {
		padding: 0.625rem 1.25rem 0.25rem;
	}

	.doc-subgroup + .doc-subgroup {
		border-top: 1px solid var(--color-base-300);
		margin-top: 0.5rem;
		padding-top: 0.25rem;
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
		padding: 0 1.25rem;
		/*
		 * 44px at every width the menu can open at.
		 *
		 * The trigger is `xl:hidden`, so this dialog is reachable up to 1279px, and the
		 * 44px rule used to sit inside `@media (max-width: 767px)`. A tablet at 768px to
		 * 1023px therefore got 40px rows: under the target size, on the device most
		 * likely to be holding the menu open one-handed.
		 */
		height: 44px;
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
	}

	@media (max-width: 767px) {
		/*
		 * Nothing left to declare. Both header triggers and every menu row carry their
		 * 44px in their base rules, at every width the menu can open at.
		 */
	}
</style>