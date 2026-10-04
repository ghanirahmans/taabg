# taabg site

Showcase and documentation site for **taabg** (Telkom Access Assurance Bot
Ghani). Static, prerendered, no server runtime.

Uses **bun** as the package manager. `bun.lock` is the only lockfile.

```powershell
bun install
bun run dev      # http://localhost:5173
bun run check    # svelte-check, zero errors expected
bun run build    # prerenders every route into build/
bun run preview  # serve the built output
bun run verify   # four guards, 69 checks. Reads build/, so build first.
```

## Bun, and the one thing to know about it

Measured on this project, cold install from a lockfile with a warm cache:

| | npm | bun |
|---|---|---|
| install | 27.9s | **6.5s** |
| `vite build` | 21.1s | 21.1s |
| `check` | 10.8s | **12.2s** |
| vite dev cold start | 2634 ms | 2634 ms |

So bun buys one thing, and it is worth having: installing is roughly four times
faster. The build and the dev server are identical either way, because bun is only
the package manager and the script runner here. Vite is not running on bun.

**`check` must go through `bun x`, not a bare bin name.** This is the trap, and it
is silent: the command still works, it just takes a minute.

```json
"check": "bun x svelte-kit sync && bun x svelte-check --tsconfig ./tsconfig.json"
```

`bun run <script>` executes a compound script on **bun's own runtime**, ignoring the
shebang, and `svelte-check` is a TypeScript language service, which is the slowest
thing in this project. Written the obvious way, `svelte-kit sync && svelte-check`,
that measured **70.1s against 12.2s**. `bun x` resolves the local binary and honours
its shebang, so the work happens on node where it belongs.

Do not "simplify" those scripts back to bare bin names. `scripts/verify/buntool.mjs`
asserts they stay, so the trap cannot come back unnoticed. It checks the script text
rather than the clock: a guard that ran `check` would take twelve seconds every time,
and the shape of the script is what makes the regression possible in the first place.

Note that `bun install --no-save` still writes `bun.lock` in bun 1.4.2, despite its
own help text. Do not rely on it to install without touching the lockfile.

## Deploying

Deployed to Vercel. `vercel.json` exists for one reason: **the first deploy failed**
with `No Output Directory named "public" found after the Build completed`.

adapter-static writes to `build/`, because `vite.config.ts` passes
`pages: 'build', assets: 'build'`. Vercel's zero-config mode guesses `public/` when it
does not recognise the framework, and `framework: null` tells it not to guess. So the
three settings that matter are `framework: null`, `buildCommand: bun run build`, and
`outputDirectory: build`.

`cleanUrls: true` is what makes `/docs/introduction` resolve to
`docs/introduction.html`. Without it every internal link would 404, because
adapter-static writes extensioned files and nothing rewrites the URLs.

`installCommand` is deliberately plain `bun install`, not `--frozen-lockfile`. Vercel
pinned bun 1.4.1 while `package.json` declares `bun@1.4.2` and `bun.lock` was written
by 1.4.2, and a frozen install refuses a lockfile it considers stale. That is a
failure mode nobody can reproduce locally, and the only thing that was actually
broken was the output directory.

There is no `404.html`. adapter-static only writes one when an `+error.svelte` route
exists, and this site has none, so an unknown path gets Vercel's own 404. That is
better than a soft 404, which is what an SPA fallback would give, but it is not styled.

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
3. `bun run check && bun run build`.

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

`scripts/verify/copy.mjs` enforces all of this and is worth running after any copy
change. It found, on its first run against the rewritten pages, a Go package path
rendered as a visible label in the hero's log band, a real group name in the
configuration example, the repository-wins sentence still in the built output after
the visible callout had been replaced, and the project author's personal website
still reachable as a default probe URL.

## Navigation, measured by using it

The reading fixes came from measuring the page. The navigation fixes came from
driving it: opening the search dialog, pressing Escape, tabbing past the end of a
list, scrolling to the bottom of a long page and seeing what was still reachable.
Every one of these passed the static checks that existed at the time.

**The whole primary navigation sat behind a 36px button.** At a 912px viewport
every nav chip is hidden and the menu trigger is the only route between sections,
next to a 189px search button. The site navigation was visibly subordinate to an
action you can replace with a keyboard shortcut. The trigger is now 44px at every
width where it appears, not only below 768px.

**Below 1024px there was no way to reach a sibling page without the site menu.**
The sidebar rail is `display: none` there, so changing documentation page meant
opening the menu, scrolling past two link groups, and finding the page: three
actions for something the desktop rail does at a glance. A sticky panel above the
prose carried both directions of movement, as two controls side by side.

**That panel is gone below 1024px, on request.** It measured 112px of pinned height
on a 360px screen, a seventh of the viewport, on every docs page before the reader
had scrolled once, and it was the largest permanent fixture on the smallest screens.
It now appears only from 1024px to 1279px, the one band where the sidebar rail is not
there to do the same job.

What that costs, measured rather than assumed: at 360px the visible links to the eight
docs pages go from *rail + panel + footer + menu* to *footer + menu*, and all eight
are still reachable, so no page is orphaned. What disappears is the list of sections
*within* the page being read, measured at 11 visible section links at 1440px against 2
at 360px. Reaching a section on a phone now means the menu, then the page, then
scrolling.

One breakpoint instead of two overlapping regimes: below 1024px there is no sidebar and
no panel, so "this width has no navigation rail" is a single fact.

**Known redundancy, left alone because it was not asked about.** Between 1024px and
1279px the panel and the sidebar both render, so the page list appears twice on that
band. The panel exists to substitute for the rail, so the clean fix is to drop the
panel from 1024px up as well and promote the section rail from 1280px to 1024px, which
deletes `PageNav.svelte`. One breakpoint either way.

**The breadcrumb's middle segment was plain text.** "Docs, Core Concepts,
Architecture" had only "Docs" clickable, which made the rest decorative. The section
now links to that section's group on the docs index, and the index carries matching
heading ids.

**The search dialog declared `aria-modal="true"` and let the keyboard past it.**
Measured with it open: 9 focusable elements inside the dialog and 65 in the
document. `aria-modal` tells assistive tech to ignore the background and does
nothing to Tab. The page behind is now `inert` while the dialog is open, and Tab
wraps at both ends so the dialog is a closed loop.

**The search field had no accessible name**, only a placeholder. Every audit missed
it, because the dialog is closed when the page loads, so Lighthouse never saw the
field and the static checks read HTML where the failure only exists once the dialog
is open.

**Dismissing the search dialog stranded keyboard users at the top of the page.**
Escape and the scrim both close it, and when it unmounted, focus fell to `<body>`.
Focus is now returned to whatever opened it. That needed two fixes which both looked
correct in isolation:

- The restore has to run *after* `inert` is released. Split across two effects the
  cleanup order decided the outcome and decided it wrong: focus was restored while
  the header was still inert, and `focus()` on an inert element silently does
  nothing at all. Both now happen in one effect, in that order.
- `opener` must not be `$state`. The effect reads and writes it, and reactive state
  read inside an effect is a dependency, so the effect invalidated itself and tore
  the dialog down the moment it opened.

The field also needs a `setTimeout` alongside its `requestAnimationFrame`, because
`requestAnimationFrame` never fires in a tab the user has not looked at, so a
shortcut pressed from a background tab opened the palette with the field unfocused.

**The site menu was a dropdown, and is now a centred modal card.** It was
`position: absolute` with `left: 0; right: 0` under the header: a band of eleven rows
across the full width, hanging off the top of the page. It read as part of the header
rather than as something opened on top of the page, and the trigger is a 44px square,
so the thing it opened was roughly forty five times its area and began at the opposite
end of the screen from the button that opened it. It is now a 30rem card centred over
a dimmed page, positioned by a transparent full-viewport wrapper with
`pointer-events: none`, which is the structure the search palette already used so that
there is one shape for a dialog on this site.

**The scrim had never worked, and the cause was three lines above it.**
`.site-header` carries `backdrop-filter: blur(8px)`, the one blur DESIGN.md permits,
and `backdrop-filter` makes an element a containing block for its `position: fixed`
descendants exactly as `transform` does. The scrim was a child of the header, so its
containing block was the 65px header box instead of the viewport, and
`inset: var(--spacing-header) 0 0 0` resolved to a box one pixel tall. Measured
**0px**: the backdrop had never dimmed anything and, having no area, could never be
clicked to dismiss the menu. Both the scrim and the dialog are now siblings of the
header rather than children of it. Measured after: 736px tall on a 800px viewport,
full width, and clicking it closes the menu.

**The menu rows were 40px on a tablet.** `.menu-row` was 2.5rem, and the 44px rule sat
inside `@media (max-width: 767px)`. The trigger is `xl:hidden`, so the dialog is
reachable up to 1279px, which means 768px to 1279px got 40px rows, under the target
size, on the device most likely to be holding the menu open one-handed. The 44px is in
the base rule now.

Measured after, opening it for real and reading the result at 360, 390, 768, 1024 and
1279px:

| | value |
|---|---|
| card width | 320px at 360, 480px from 768 up |
| gap either side of the card | 20px at 360, 144px at 768 |
| card fully on screen | yes, at every width |
| rows escaping the card | 0 |
| row height | 44px at every width |
| scrim | 736px of a 800px viewport, from below the header to the bottom |
| click outside the card closes it | yes |
| Escape closes it and returns focus to the trigger | yes |
| Tab from the last item | wraps to the first |
| Shift+Tab from the first item | wraps to the last |
| Tab in the middle | not intercepted |
| focusable elements in the page behind | 0, `main` is `inert` |

The scrim still starts below the header, on purpose: the header carries the brand, the
search trigger and the X, so the dialog closes with the control that opened it and the
page keeps a stable top edge while it is open.

## Reading comfort, measured rather than assumed

Four things about reading this site were wrong, and every one of them passed all
the static checks that existed. They were found by measuring the rendered page in
a browser, which is why the numbers below are measurements and not intentions.

**The docs prose was 96 characters wide.** Comfortable measure is 45 to 75, and
past about 80 the eye loses the return sweep and starts skipping lines. The CSS
declared `max-width: 48rem`, which looked deliberate. Prose now declares `68ch`,
which renders at 73 characters, and the unit is `ch` on purpose: it is the width of
a zero, so it tracks the font instead of assuming an average character width.
Tables, code frames and the log band are deliberately excluded from that cap,
because a five column table at 68ch wraps into a mess and the data on this site is
allowed to be wider than the prose describing it.

**`h3` was 16px/600 against 16px/400 body text**, so weight was the only thing
separating a subheading from a paragraph. It read as a heading because of the
space above it, not because of how it looked. It is now `--text-lead`.

**The docs page title matched its own section headings.** The h1 was 28px and the
h2 was 28px, so the page had no clear top. The landing page never had this
problem, which is why it went unnoticed: its h1 is `--text-display`.

**The inline table of contents scrolled out of reach.** Below 1280px the TOC is a
disclosure above the prose, and it was `position: static`. Measured on the
architecture page it was off screen by scroll 1500 of a 6217px page, so on a tablet
or a phone the entire in-page navigation became unreachable for the rest of the
read. It is now sticky below the header, with its own opaque surface so prose does
not scroll through it. Collapsed it is 44px, so the cost of pinning it is small.

Two more found the same way:

- **Stock `github-dark` comments measured 3.59:1** on this site's code surface,
  and comments are most of a shell snippet, so a code block read as mostly below
  AA. `src/lib/highlight.js` now declares a local theme; the comment token is
  `#9aa4b2` at 6.86:1.
- **Footer links were inline at 22px**, under the 24px minimum for a target size,
  and the search button's accessible name was shorter than its visible label.
  Lighthouse reports 1.00 accessibility, 1.00 best practices and 1.00 SEO on all ten
  pages, with no failing audit.

`scripts/verify/responsive.mjs` asserts the declarations behind all of this. It cannot
confirm the rendered result, so the browser measurement has to be repeated after a
type-scale change.

## Phones and tablets, which were never measured until they broke

Everything above was measured between 912px and 1280px. A viewport resize tool was not
available, so **a phone was never once rendered** while the reading and navigation work
was being done. Every claim in the two sections above was true and the site was still
bad on a phone.

The fix was a probe page that renders the site inside same-origin iframes at phone
widths. Media queries inside an iframe resolve against the iframe, so a 360px iframe
is a genuine 360px layout, and same-origin means the probe can read the result with
`getBoundingClientRect` and computed styles. It is throwaway: it lives in `static/`,
gets deleted after the run, and its numbers are copied into this file.

Measured across all ten pages at 360, 390, 414 and 768px, before and after:

| | before | after |
|---|---|---|
| pages that scroll sideways at 360px | 3 of 10 | **0** |
| widest content in a 345px viewport | 549px | **345px** |
| elements clipped by their container | 4 | **0** |
| tables needing a sideways swipe on a phone | 5 | **0** |
| controls under 44px | 9 | **0** |
| text under 11px | 0 | 0 |
| sticky panel height at 360px | 192px (25% of the screen) | **112px (14%)**, then removed on request |
| docs pages reachable by a visible link at 360px | 8 of 8 | 8 of 8 |
| section links visible at 360px | 11 | 2 |

Four of those were one fault each, and each is a shape that has already bitten this
project in a different disguise.

**Two grid tracks with no floor.** `.snippet-pair` and `.split` declared `display: grid`
and nothing else, so the implicit track was `auto`, which sizes to max-content. The code
frames inside are wider than a phone, so the track measured 468px and 525px inside a
297px column and dragged the whole page sideways. `minmax(0, 1fr)` on every track, and
`min-width: 0` on the code frames, which carry `overflow-x: auto` and so have no
automatic minimum of their own.

**A conditional rule that could not win.** The log band gives `.log-message` a
`flex: 1 1 0`, which Svelte compiles to `.log li > .log-message:where(.svelte-x)`, three
classes. The `@media (width<=640px)` rule meant to widen it said `.log-message`, two
classes. The media query matched at every phone width and `matchMedia` returned `true`,
while the computed `flex-basis` stayed `0px`: three classes beats two however late the
rule is. The message shared a line with four fixed fields and measured **4px wide** at a
414px viewport. This is the same mistake as the dead `640px` rule from the earlier
section, in the opposite direction.

**A container query styling its own container.** Moving the tables from a viewport query
onto a container query left `.table-scroll { overflow-x: visible }` inside the block. An
element cannot query itself, so that rule resolves against an ancestor, and no ancestor
was a container. It compiled, it passed every static check, and it did nothing.

**Touch floors scoped to a width band.** `.codeblock-copy` and `.tab` carried
`min-height: 44px` inside `@media (max-width: 767px)`. A tablet in portrait is 768px
wide, so it fell one pixel outside the band and got a 26px copy button and 36px tabs.
A phone is narrow; a thumb is not a width.

Two decisions came out of the measurements rather than the faults:

- **Tables stack into cards when the frame gets narrow, judged by a container query and
  not by the window.** A viewport query at 640px left a band between 640px and 743px
  where the window was wide enough to skip the cards and the frame was still too narrow
  to hold the table, so it scrolled sideways anyway. Each cell now carries its column
  name as `data-label`; `src/lib/remark-tables.js` writes those for the docs and the
  landing tables carry them in markup. The label sits on the same line as the value,
  because as a block of its own it cost an extra line per cell and the portals table
  measured 1573px on a phone that way, against 601px when it scrolled sideways.
  Neither is right, so it is about 220px per row now.
- **The tables have no width floors at all.** A floor is a declaration that a table
  refuses to be narrower than X, which makes the frame scroll whenever the frame is
  narrower than X. The two had to agree at every width across two files, and they
  drifted: a scoped `min-width: 44rem` in `+page.svelte` scored two classes against the
  global `min-width: 0` in the card mode and won, and the landing tables scrolled
  sideways by 409px on a 360px screen. Without a floor a table shrinks and wraps, and
  the site now has no nested horizontal scrolling at all.
  The card mode's threshold is **34rem**, and it was 45rem first. That number was tuned
  for the five column portals table and applied to every table, which turned the three
  column commands table into a stack of cards inside a 625px track on a 1440px screen.
  A card list is right in a phone frame and wrong in a desktop column, and one
  threshold cannot tell those apart.
- **The docs tables stopped being scrolled by their own `<table>` element.** `display:
  block` with `overflow-x: auto` on the table is the long-standing scrollable-table
  hack, and it is why every docs table on a phone needed a sideways swipe: the column
  header scrolls out of sight while you read the last column. It also drops the table
  out of the structure assistive tech builds. `remarkTables` wraps each one, and the
  wrapper is what scrolls.

One measurement in this file is misleading and is recorded here so nobody chases it
again: **borders measure 0.8px in this environment, not 1px.** A `<div>` with an inline
`border-top: 1px solid` reports `0.8px`, and `devicePixelRatio` is 1.25, so
1 / 1.25 is exactly what is being reported. It is the renderer rounding borders to whole
device pixels, not a stylesheet that shrank them.

Still true, and not fixable here: the landing page is 13,895px tall at 360px. That is
six sections of real content on a narrow screen, not a layout fault, and shortening it
would mean writing less about what the tool does.

## The guards

`bun run verify` runs four guards, 69 checks. They read the built HTML and the compiled
CSS, because there is no browser attached to the working session. That works for
proving a declared floor exceeds its container. It cannot prove what a rendered page
looks like, which is why the phone work above is measured by hand and recorded here.

| guard | reads | checks |
|---|---|---|
| `responsive.mjs` | compiled CSS | 9 |
| `nav.mjs` | built HTML | 45 |
| `copy.mjs` | built HTML and docs source | 10 |
| `buntool.mjs` | `package.json` | 5 |

`responsive.mjs` exists because the phone work produced four faults that every
pre-existing check reported as green. Each of its six sections names the fault it
catches:

1. **A conditional rule has to be able to win.** Specificity is computed over the whole
   selector branch, not the last compound, and a shorthand is expanded so that
   `flex: 1 1 0` is understood to set `flex-basis`.
2. **A container query cannot reach its own container.**
3. **Every flexible grid track can shrink to zero.** `repeat()` is expanded, so
   `repeat(3, minmax(0,1fr))` is read as three tracks rather than one unrecognised one.
4. **A min-width floor is contained by a scrollable frame.**
5. **No control is fixed below 44px** without a narrow-width or coarse-pointer rule.
6. **A 44px target floor is unconditional or scoped to a pointer.**

`mutation.mjs` is a meta-guard: it reintroduces each of those faults into the compiled
CSS and asserts that the intended check goes red. A guard that has never reported a
failure is indistinguishable from one that cannot fail, and this project has produced
three false greens that way.

```
bun run verify            # the four guards
bun run verify:mutation   # 5 reintroduced faults, 5 caught by the intended check
```

Two things the runner will not do, on purpose. It does not report a pass for a guard
that is missing: a PowerShell loop once printed `failures=0` for two files that did not
exist, because it counted results instead of checking it had any. And it does not stop
at the first failure, so one broken guard cannot hide the state of the others.

### Failure modes these guards have already had

Every one of these produced a false green here:

1. **An unresolvable value must return null, never 0.** The log budget divides by
   the band's font size. When that lookup missed `--text-micro` in its scale table
   it returned 0, the budget became `Infinity`, and every one of the 21 rows passed
   a check that could not fail. It now reports `Infinity` as unmeasurable and says
   so in the output, because a guard that silently degrades into a no-op is worse
   than no guard: it prints green.
2. **Read the source data, not only the rendered HTML.** The HTML for the log band

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
7. **Strip Svelte's scope hash before matching a compiled selector.** Svelte emits
   `.thing.svelte-1abc23`, so a guard matching `.thing {` matches nothing and
   reports correct stylesheets as broken. This bit the container-query check in
   `responsive.mjs` too: it compared an authored `.table-scroll` against the
   `.table-scroll.svelte-1uha8ag` that establishes the container, found no match,
   and passed the one fault it exists to catch.
8. **Read the compiled CSS, not the source, for anything Tailwind owns.** Tailwind
   owns an `@layer base` block and reorders it, so a source scan for `h1 {` does
   not reliably find the rule. The compiled file has `h1{...}` as a standalone
   rule that a source-shaped pattern missed entirely. The same applies to Tailwind
   grid utilities: `display: grid` and `grid-template-columns` arrive as two rules
   for two classes, so a check that required both in one rule silently skipped
   every one of them.
9. **Compare like with like.** A guard compared a token name against a pixel
   number, so a correct heading reported as wrong, and the obvious suspicion fell
   on the working extractor rather than on the one-character bug in the
   comparison.
10. **Read the last declaration, not the first.** A helper concatenated every rule
    mentioning a selector and then took the first match, so a shared
    `.search-trigger, .menu-trigger { height: 36px }` masked the standalone rule
    that overrides it to 44px. The cascade resolves to the later one.
11. **Accept both units.** A guard read `width:` expecting a rem figure and found
    `44px`, and reported a correct rule as unset.
12. **Match class names as whole tokens.** A check for control heights looked for
    `/tab/i` anywhere in a selector and flagged `.table-scroll`, because "table"
    begins with "tab". A guard that cannot tell a data table from a set of tabs is
    worse than no guard, because it teaches the reader to ignore it.
13. **Never cap the number of findings before reporting.** `copy.mjs` returned early
    once it had twelve hits, to keep the output short. The docs already contain
    twelve ten digit sample numbers, so the thirteenth, which was the only real
    one, was discarded and the check reported clean.
14. **`every()` on an empty array is true.** Stripping pseudo-classes off
    `tr:last-child > :last-child` left an empty subject, and the container check
    read a rule about a table row as a rule about the frame. An empty collection
    must not satisfy a comparison.
15. **A visual effect on an ancestor becomes a containing block.** `backdrop-filter`
    on the header silently redefined what `position: fixed` meant for every fixed
    descendant, and the scrim measured 0px tall for as long as it was there. Nothing
    about the CSS looked wrong, so only measuring the rendered box found it.
16. **Look for the check that passes at a width nobody ships.** The menu rows were
    40px between 768px and 1279px, which is a tablet, which is a real device. The
    44px rule existed and was correct; it was just scoped to a band that stopped one
    pixel short of where the control became reachable.
17. **A build that succeeds locally can still fail on a host you do not control.**
    The first Vercel deploy failed on `No Output Directory named "public"`, after
    `✔ done`, after adapter-static had written the site. Nothing in the repository said
    where the output was supposed to go, so the only place to record it is
    `vercel.json`.

When a check cannot measure something, it should say `unmeasurable` rather than
defaulting to a value that passes.

**A guard cannot check behaviour, only declarations.** The focus trap wrapping, the
focus actually being restored, and the disclosure actually opening are properties of
a running page. The guards assert the declarations behind them and stop there; those
behaviours were confirmed in a browser and have to be confirmed there again after a
change to the palette or the docs panel.

## Layout rules worth knowing

**`.shell` is global, deliberately.** It lives in `app.css`, not in a component
`<style>` block. Svelte scopes component styles, so a `.shell` declared in
`+page.svelte` silently fails to apply to the `<div class="shell">` inside
`Hero.svelte`, which is a different component. That bug shipped once and left the
hero running edge to edge with no measure and no centring. If you add a component
that needs the gutter, use `class="shell"` and do not redefine it.

**No horizontal scroll, anywhere.** Three rules, each added after it was reported:

1. **A table's width floor has to be liftable by the same rule that removes the
   scroll.** The floors are gone now, and that is the point. A floor in a frame that
   cannot scroll does not protect the table, it just pushes the table past its
   container. A table that wraps is better than a table that insists.
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
6. **A media query goes after the rule it overrides, and must outrank it.**
   `.log-level` is declared twice at the same specificity, so source order decides;
   declaring the 480px block above the base rule left the override dead. The other
   half is worse: the message's `flex-basis: 100%` in the 640px block sat at two
   classes against the base rule's three, so it was dead at every width while
   `matchMedia` reported the query as matching. Later in the file does not help.
7. **Every grid track needs a floor of zero.** An implicit `auto` track sizes to
   max-content, so a code frame wider than the column grew the track and pushed
   the page sideways. A bare `fr` is `minmax(auto, 1fr)` and carries the same
   min-content floor, so it needs `minmax(0, …)` too.
8. **A floor and the thing that removes it have to be in the same place.** The
   table floors lived in `+page.svelte`, scoped, and the card mode that lifts them
   is global, so `min-width: 0` scored one class against the scoped rule's two and
   lost. Source order only decides between rules of equal weight. Neither is there
   any more; the floor went away entirely, which removes the possibility.

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
