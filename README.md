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

1. Write `src/lib/docs/<slug>.md`. **Give every `h2` and `h3` an explicit `{#id}`.**
   Without one the heading renders but never parses, so the page loses its table
   of contents and its search entries. This is the single easiest mistake to make
   here and it fails silently.
2. Add an entry to `DOC_ENTRIES` in `src/lib/docs/manifest.ts`, with `order`, an
   `outcome` sentence, and `keywords` that include the words an operator would
   actually type.
3. `npm run check && npm run build`.

The sidebar, search, prev/next and prerendering pick it up automatically.

## The repository is private, so the documentation has to stand alone

The bot's source repository is not public. Every page here is written for a reader
who has no access to it, which rules out a whole category of what documentation
usually leans on:

- **No provenance citations.** Pages used to carry `source.path` and the footer
  said "where a page and the repository disagree, the repository wins". For anyone
  outside the organisation there was nothing to open and no authority to defer to,
  so the sentence only weakened the page it sat under. Each entry now carries an
  `outcome` instead: what the reader can do after reading it.
- **No internal references.** A Go package path, a design record number, an
  architecture document title: all unreadable, and all presented as if they were
  authority. Where the fact genuinely lives in the source and cannot be shown, such
  as the exact region the screenshot crop is locked to, the page says so.
- **Nothing from the private documents that should not be published at all.** No
  real customer numbers, site codes, ticket numbers, internal gateways, or group
  names. Sample identifiers use one documented convention, `1000000000NN` for a No
  Internet and `ODP-XXX-YY/001` for an ODP, which teaches the shape and cannot
  belong to a customer.
- **Every claim is observable from outside the tool**, or it is marked as not
  being so. A portal's concurrency limit, a timeout, a log format, a command: all
  things a reader can check by running it.

A reader who cannot picture the product cannot use the documentation, so the pages
lead with a scene rather than a definition. `introduction.md` shows a request, the
acknowledgement, and the reply before it explains any of it, and links the
vocabulary page at the point the jargon first appears rather than at the end.

`tmp-verify/content.mjs` enforces all of this and is worth running after any copy
change. It found, on its first run against the rewritten pages, a Go package path
rendered as a visible label in the hero's log band, a real group name in the
configuration example, the repository-wins sentence still in the built output after
the visible callout had been replaced, and the project author's personal website
still reachable as a default probe URL.

## Guards have to be able to fail

Everything in this site is verified by reading the built HTML and the compiled CSS,
because there is no browser attached to the working session. That works for proving
a declared floor exceeds its container. It cannot prove what a rendered page looks
like, and it has three failure modes worth naming, each of which has already
produced a false green here:

1. **An unresolvable value must return null, never 0.** The log budget divides by
   the band's font size. When that lookup missed `--text-micro` in its scale table
   it returned 0, the budget became `Infinity`, and every one of the 21 rows passed
   a check that could not fail. It now reports `Infinity` as unmeasurable and says
   so in the output, because a guard that silently degrades into a no-op is worse
   than no guard: it prints green.
2. **Read the source data, not only the rendered HTML.** The HTML for the log band
   contains one panel, so a check that reads only the HTML measures one of three
   scenarios. The tabs now render every panel and hide the inactive ones, which is
   what the WAI-ARIA pattern wants anyway.
3. **Check every page, not one representative page.** Every heading-id bug escaped
   because each guard reached for `architecture.html`. Comparing parsed against
   rendered ids on all pages is what found it.
4. **Derive a budget, do not remember one.** The docs code column was budgeted at a
   hardcoded 78 characters, which is more conservative than the real figure of 84
   and flagged a line that fits. A guard that cries wolf on correct content is a
   guard people learn to ignore.
5. **Assert a fact where it is written.** Portal attribution is checked by reading
   the `Backs` row inside each portal's own markdown section, not by regex
   proximity across the rendered page. Collapsing whitespace for a text search
   turns `[^\n]*` into `[^\s\S]*`, which matches almost anything.
6. **Read the whole built output, not only the visible DOM.** The
   "repository wins" sentence survived in the serialised page payload after the
   rendered callout had been replaced, so a text-only check reported it as fixed.

When a check cannot measure something, it should say `unmeasurable` rather than
defaulting to a value that passes.

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
5. **Name the fields, never `> span`.** `.log li > span { white-space: nowrap }`
   scored (0,2,2) and beat `.log-message` at (0,2,0), so the message inherited
   nowrap, collapsed under `flex: 1 1 0`, and was clipped by the frame. The
   nowrap rule now names `.log-time`, `.log-level`, `.log-trace` and
   `.log-component` individually.
6. **A media query goes after the rule it overrides.** `.log-level` is declared
   twice at the same specificity, so source order decides. Declaring the 480px
   block above the base rule left the override dead.

`LogBand` renders every transcript and hides the inactive panels with `hidden`,
which is what the WAI-ARIA tabs pattern asks for. Rendering only the active one
meant an inactive tab's `aria-controls` pointed at an element that was not in the
DOM, and it also meant any check that read the built HTML only ever saw one of the
three scenarios.

`overflow-x: auto` stays on `.table-scroll` and `.shiki` as a safety net for
narrow viewports, but nothing should reach it on a desktop layout. A table wider
than a phone scrolls inside its frame, which is correct; clipping it would not be.

**`aria-controls` names something that exists, in every state.** The mobile menu
renders its panel unconditionally and hides it with `hidden` while closed, so the
trigger can carry `aria-controls="mobile-menu"` permanently. The earlier version
rendered the panel conditionally and dropped `aria-controls` instead, which left a
disclosure button with nothing to disclose. Same requirement, opposite resolution,
so `hidden` on the panel and `display: none` forced for both `.scrim[hidden]` and
`.mobile-menu[hidden]`.

**Removing a trigger means removing what it opened.** The docs drawer was deleted
along with its "Browse documentation" button, and taking only the button would have
left a panel with no way in whose Escape handler still called
`drawerTrigger?.focus()` on a `null` reference. Deleting a trigger is half a change:
audit what pointed at it before stopping.

**The navbar menu is the only documentation navigation below 1024px.** It used to
list four hand-picked pages and lean on the drawer for the rest. With the drawer
gone it carries all seven, grouped by the same section headings the sidebar uses, so
the phone reader gets the orientation the desktop rail gives. A guard reads the menu
out of the built HTML and asserts every `DOC_ENTRIES` slug is one tap away, because
this is exactly the kind of completeness that quietly decays.

## Documentation layout

The docs shell follows what the documentation-layout research converges on. The
sources are worth naming because the reasoning is not obvious from the result:

- **The table of contents is a control surface, not a list of links.** It tracks
  the reader's position with an IntersectionObserver, marks the current heading,
  and offers a way back to the top. Every source treats a static TOC as a failure:
  a reader who cannot tell where they are stops trusting the page.
- **IntersectionObserver, not a scroll handler.** A scroll handler runs on every
  frame and fights the browser's own scrolling.
- **Topmost heading wins.** Several headings are usually in view at once, and
  taking whichever fires first makes the marker flicker between two entries.
- **Below 1280px the TOC becomes a disclosure above the prose**, not nothing.
  Losing in-page navigation on a tablet or phone is the most common failure in
  mobile docs.
- **The rail column is always in the grid**, even with nothing to put in it.
  Rendering it conditionally moved the content column sideways between pages,
  which is layout shift, which is pure friction.
- **Breadcrumbs on every content page.** They matter most for a reader who
  arrived from a search engine and has no idea how deep they are.
- **Search indexes fenced content.** A pasted error message or a half-remembered
  flag appears only inside a code block, and that is the most valuable thing a
  reader can search for. Such a hit shows the command, monospaced.
- **`scroll-padding-top` clears the sticky header**, so an anchor lands with air
  around it rather than under the bar.

### The heading-id trap

Two parsers read the same markdown, and they must agree:

- `remark-headings.js` assigns an id to every heading, falling back to a slug
- `search.ts` `parseDoc` only recognises an explicit `{#id}`

A heading without one therefore **renders with an id but parses as nothing**, and
the page silently loses its table of contents and its search index. `introduction.md`
shipped that way for a long time and every earlier guard missed it, because they
all checked `architecture.html`. Give every `h2` and `h3` an explicit `{#id}`, and
the regression suite compares parsed against rendered ids on every page.

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
