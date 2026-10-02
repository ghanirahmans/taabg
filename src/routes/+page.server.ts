import { highlight } from '#lib/highlight.js';

/**
 * Server-only load. Highlighting here keeps Shiki out of the client bundle: the
 * landing page is prerendered, so this runs once at build time.
 */

const SNIPPETS = {
	install: `taabg doctor      # six checks, tells you what is missing
taabg login tele  # phone, then code, then 2FA
taabg run         # foreground, --debug for more`,

	service: `taabg start      # background
taabg status     # exit code: 0 running, 3 stopped
taabg logs -f    # follow today's log
taabg restart    # stop, then start`,

	scrape: `# Every ODP behind a cabinet, measured.
umas ODP-XXX-YY/001

# One line's profile from the exchange.
embassy 100000000011

# Has this customer paid?
tolong cek tagihan 100000000011`
} as const;

export function load() {
	return {
		snippets: {
			install: highlight(SNIPPETS.install, 'shell'),
			service: highlight(SNIPPETS.service, 'shell'),
			scrape: highlight(SNIPPETS.scrape, 'shell')
		}
	};
}