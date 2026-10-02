import { highlight } from '#lib/highlight.js';

/**
 * Server-only load. Highlighting here keeps Shiki out of the client bundle: the
 * landing page is prerendered, so this runs once at build time.
 */

const SNIPPETS = {
	install: `taabg doctor      # check the install
taabg login tele  # phone, code, 2FA
taabg run         # foreground, --debug for more`,

	service: `taabg start      # background service
taabg status     # 0 running, 3 stopped
taabg logs -f    # follow today's log
taabg restart    # stop then start`,

	scrape: `# One ODP, both portals.
umas ODP-MDC-FAY/015

# Customer radius profile.
embassy 111209141110

# Billing.
tolong cek payment 111213094876`
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