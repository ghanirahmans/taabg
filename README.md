# taabg site

Showcase and documentation site for **taabg** (Telkom Access Assurance Bot
Ghani). Static, prerendered, no server runtime.

```powershell
npm install
npm run dev      # http://localhost:5173
npm run check    # svelte-check, zero errors expected
npm run build    # prerenders every route into build/
npm run preview  # serve the built output
```

## Where this lives

This is a standalone project at `D:\Projects\taabg`, deliberately outside the Go
repository at `D:\Projects\telkom-access-assurance-bot-ghani`.

That separation matters because the Go project treats Node as a build-time
detail: its `frontend/README.md` states that compiled CSS is committed "so
`go build` never requires Node.js or this toolchain." A site inside that repo
would put `node_modules` and a Node toolchain in the Go module graph and
contradict that. Keeping it here means `go build` and `go test ./...` are
untouched, and this directory can be deleted without affecting the bot.

The site documents that project. Its palette, spacing and typography are
transcribed from that repository's `DESIGN.md`, so it reads as the same product as
the dashboard. If you change a colour here, change it there too.

## Structure

```
src/
├── app.css                       design tokens + prose + code frame
├── lib/
│   ├── docs/
│   │   ├── manifest.ts           one entry per page: nav, order, source, keywords
│   │   ├── search.ts             build-time index + ranked query
│   │   └── *.md                  the seven pages
│   ├── content/
│   │   ├── capabilities.ts       portals, pipeline, commands, guardrails
│   │   └── transcript.ts         the log band scenarios
│   ├── components/
│   │   ├── Navbar.svelte         four-zone header, dropdown below 1280px
│   │   ├── Footer.svelte
│   │   ├── Sidebar.svelte        docs rail
│   │   ├── Hero.svelte
│   │   ├── FeatureGrid.svelte    the guardrail rules
│   │   ├── LogBand.svelte        terminal band, the identity motif
│   │   ├── CodeBlock.svelte      landing-page snippets
│   │   └── CommandPalette.svelte Ctrl+K search
│   ├── highlight.js              Shiki, build time only
│   ├── remark-headings.js        mdsvex emits no heading ids; this adds them
│   └── types/docs.ts
└── routes/
    ├── +layout.ts                builds the search index
    ├── +page.svelte              landing
    └── docs/[slug]/              dynamic doc route
```

## Decisions worth knowing

**`manifest.ts` is the gate.** The sidebar, the search index, the prev/next rail
and the prerender entry list all read from it. A markdown file that is not in the
manifest is not reachable, and a manifest entry with no file fails the build. That
keeps a stray `.md` from becoming a dead page.

**Heading ids are explicit.** mdsvex does not emit them, so `remark-headings.js`
adds them, preferring the `{#id}` written in the markdown and falling back to a
slug. `search.ts` reads the same `{#id}` back out of the raw source, so the table
of contents, the anchors and the search index cannot drift apart.

**Shiki runs at build time only.** Docs are highlighted by mdsvex during
compilation; the landing-page snippets are highlighted in a server-only load.
Nothing ships a highlighter to the browser. `src/lib/highlight.js` maps fence
tags to loaded grammars (`shell` to `sh`, `pwsh` to `powershell`) so the common
labels do not silently fall back to plain text.

**One Shiki instance.** `highlight.js` is shared between the mdsvex preprocessor
and the server load, so grammars are not loaded twice per build.

**`#lib`, not `$lib`.** SvelteKit 3 removed `$lib`. The subpath import is declared
in `package.json` `imports` and mirrored in `tsconfig.json` `paths` so
`svelte-check` resolves it.

## Adding a documentation page

1. Write `src/lib/docs/<slug>.md`. Give every `h2` and `h3` an explicit `{#id}`.
2. Add an entry to `DOC_ENTRIES` in `src/lib/docs/manifest.ts`, with `order`,
   `source.path` pointing at the file it was written from, and `keywords` that
   include the words an operator would actually type.
3. `npm run check && npm run build`.

The sidebar, search, prev/next and prerendering pick it up automatically.

## Layout rules worth knowing

**`.shell` is global, deliberately.** It lives in `app.css`, not in a component
`<style>` block. Svelte scopes component styles, so a `.shell` declared in
`+page.svelte` silently fails to apply to the `<div class="shell">` inside
`Hero.svelte`, which is a different component. That bug shipped once and left the
hero running edge to edge with no measure and no centring. If you add a component
that needs the gutter, use `class="shell"` and do not redefine it.

**No horizontal scroll, anywhere.** Three rules, each added after it was reported:

1. **A width floor belongs to a table, not to a shared class.** `.data` used to
   carry `min-width: 44rem`, which is right for the portals table (full content
   width) and 81px too wide for the commands table, which lives in the 623px
   track of the asymmetric split. Floors now live on `.table-wide` and
   `.table-narrow`.
2. **A log row wraps; a log band does not scroll.** The transcript used
   `white-space: pre` with `min-width: max-content`, so the longest line needed
   711px in a 603px band and the timestamp column scrolled out of view with it.
   The five fields are now a grid with fixed tracks and only the message wraps.
3. **Code lines have a character budget.** A 14px monospace line is roughly 8.4px
   per character, which leaves about 62 characters in a two column snippet track
   before the `<pre>` scrolls, and 78 in the 48rem docs column.

4. **A wrap needs somewhere to wrap to.** Fixing the scrollbar by wrapping rows
   caused a worse bug: as a grid, the log row used `auto` tracks, which never
   shrink, so on a 360px phone the four fixed fields took 326px of a 232px band
   and the message collapsed to nothing. The row is now a wrapping flex row with
   `min-width: 0` on the message, and below 640px the message takes a full line.

`overflow-x: auto` stays on `.table-scroll` and `.shiki` as a safety net for
narrow viewports, but nothing should reach it on a desktop layout. A table wider
than a phone scrolls inside its frame, which is correct; clipping it would not be.

## Spacing, and why it differs from the dashboard

`DESIGN.md` in the Go repository specifies 14px on a 1.5 line height with a 32px
header, because that dashboard is an **operations console**: a technician scans a
live panel and wants density.

This site is a reading surface, so it takes prose metrics instead, deliberately:

| Token | Dashboard | Here | Why |
|---|---|---|---|
| body size / leading | 14px / 1.5 | 15px / 1.6 | reading, not scanning |
| prose size / leading | n/a | 16px / 1.75 | long-form docs pages |
| header height | 2rem | 4rem | 32px read as a toolbar strip; the brand had nowhere to sit |
| section rhythm | 16-32px | 80px / 112px | sections need a visible pause between them |
| prose block gap | n/a | 1.5rem | dense blocks read as a wall |
| measure | n/a | 48rem | about 75 characters |

Supporting type was raised too: the docs rail and table of contents are 15px, nav
chips 15px, cards 15px, small captions 13px. The 12px micro-label stays at 12px
because it is a label, not prose.

Two colours were nudged while making room for this:

- the log band's timestamp and trace id went from 45% to 50% opacity, because
  45% over a `base-200` panel measures 3.99:1, under AA
- the docs source path went from 50% to 60%, for the same reason

Quietest tier in the build is now 50%, measured against whichever surface it sits
on rather than always against `base-100`.

## Content rules

Documentation here is a reading surface, not a second source of truth. Where a
page and the repository disagree, the repository wins. Each page names the file
it was written from so a reader can check it.

Numbers on the landing page are countable in the repository: five portals, seven
checks, and the semaphore limits in `AGENTS.md`. The log band is labelled as a
reconstruction of the real console format, not a captured session.
