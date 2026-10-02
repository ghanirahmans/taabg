<script lang="ts">
	import '../app.css';
	import Navbar from '#lib/components/Navbar.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import CommandPalette from '#lib/components/CommandPalette.svelte';

	let { children, data } = $props();
</script>

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-base-200 focus:px-3 focus:py-2 focus:text-sm focus:text-primary"
>
	Skip to content
</a>

<Navbar />

<main id="main">
	{@render children?.()}
</main>

<Footer />

<!-- Available on every route, so Ctrl+K works from the landing page and the docs. -->
<CommandPalette index={data.docIndex} />