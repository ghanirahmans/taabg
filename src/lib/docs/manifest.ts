import type { NavItem, NavSection } from '#lib/types/docs';

/**
 * One entry per page under `/docs`. The sidebar, the command palette, the
 * previous/next rail and the `entries()` prerender list all read from here, so a
 * page cannot exist in the rail without being built, and a built page cannot be
 * missing from the rail.
 *
 * `source` points at the canonical file in the Go repository. These pages are a
 * reading surface, not a second source of truth: when the two disagree, the
 * repository wins.
 */
export interface DocEntry extends NavItem {
	description: string;
	order: number;
	/** What a reader can do after this page. The only useful kind of provenance
	 *  for a page whose source repository they cannot open. */
	outcome: string;
	/** Extra search terms, including the Indonesian words operators type. */
	keywords: string[];
}

/*
 * These pages are written from the bot's source repository, which is private and
 * licensed for internal use. Nothing here points at a file the reader could open,
 * because there is nothing for them to open: `source.path` used to name an
 * `internal/...` Go file and told the reader to check it, which was advice that
 * could only be followed by someone already inside the organisation.
 *
 * Each entry therefore carries `outcome`, a sentence about what the page leaves the
 * reader able to do, and every claim is either observable from outside the tool or
 * drawn from something the tool prints. Where a fact genuinely lives in the source
 * and cannot be shown, such as the exact region the screenshot crop is locked to,
 * the page says so instead of implying it is showing you.
 */
export const DOC_ENTRIES: DocEntry[] = [
	{
		title: 'Introduction',
		slug: 'introduction',
		section: 'Getting Started',
		order: 1,
		description: 'What taabg does, what a request looks like in the group, and where it runs.',
		outcome: 'Describe what the bot does to a colleague who has never seen it.',
		keywords: ['overview', 'about', 'ringkasan', 'apa itu', 'bot', 'telegram', 'gambaran']
	},
	{
		title: 'Vocabulary',
		slug: 'vocabulary',
		section: 'Getting Started',
		order: 2,
		description: 'The access network terms the bot uses, and the shape of each identifier.',
		outcome: 'Read an ODP code, a No Internet, LOS or FUP without guessing.',
		keywords: [
			'istilah', 'glossary', 'kamus', 'odp', 'onu', 'ont', 'los',
			'fup', 'speedy', 'no internet', 'unspec', 'acsis', 'gladius',
			'proman', 'ibooster', 'finpay', 'totp', 'altcha', 'splitter',
			'olt', 'padam', 'serial'
		]
	},
	{
		title: 'Installation',
		slug: 'installation',
		section: 'Getting Started',
		order: 3,
		description: 'Install the executable, write the configuration file, authenticate, and confirm health.',
		outcome: 'Get it installed, configured and answering on one machine.',
		keywords: ['install', 'setup', 'installer', 'env', 'login', 'doctor', 'path', 'instalasi', 'konfigurasi']
	},
	{
		title: 'Features',
		slug: 'features',
		section: 'Core Concepts',
		order: 4,
		description: 'The seven checks, the five portals behind them, and why each portal has its own limit.',
		outcome: 'Pick the right check for a question, and predict how it will behave.',
		keywords: ['features', 'portal', 'gladius', 'proman', 'ibooster', 'acsis', 'finpay', 'fitur', 'cek']
	},
	{
		title: 'Architecture',
		slug: 'architecture',
		section: 'Core Concepts',
		order: 5,
		description: 'How a request moves through the system, and why scraping never depends on chat.',
		outcome: 'Predict what a change to one part does to the rest.',
		keywords: ['architecture', 'layer', 'pipeline', 'design', 'arsitektur', 'queue', 'antrian', 'semaphore']
	},
	{
		title: 'Basic Usage',
		slug: 'usage',
		section: 'Guides',
		order: 6,
		description: 'Ask for a check in plain language, or run it from the browser.',
		outcome: 'Ask for a check without learning any syntax, and read the reply.',
		keywords: ['usage', 'how to', 'request', 'web cek', 'dashboard', 'cara', 'pakai', 'gimana']
	},
	{
		title: 'Bot Commands',
		slug: 'commands',
		section: 'Guides',
		order: 7,
		description: 'The short catalog of direct commands, and the much longer list of things it ignores.',
		outcome: 'Tell silence apart from a fault.',
		keywords: ['command', 'prefix', 'help', 'status', 'ping', 'perintah', 'alias', 'diam']
	},
	{
		title: 'Troubleshooting',
		slug: 'troubleshooting',
		section: 'Guides',
		order: 8,
		description: 'Silence, captcha loops, a paused queue, saturated portals, and how to read the log.',
		outcome: 'Diagnose a failure from the log instead of restarting and hoping.',
		keywords: [
			'troubleshooting', 'error', 'captcha', 'vpn', 'stuck', 'semaphore',
			'masalah', 'log', 'diagnosa', 'antrian penuh'
		]
	}
];

export const DOC_SECTIONS: NavSection[] = [
	{
		title: 'Getting Started',
		items: DOC_ENTRIES.filter((d) => d.section === 'Getting Started').map(toNavItem)
	},
	{
		title: 'Core Concepts',
		items: DOC_ENTRIES.filter((d) => d.section === 'Core Concepts').map(toNavItem)
	},
	{
		title: 'Guides',
		items: DOC_ENTRIES.filter((d) => d.section === 'Guides').map(toNavItem)
	}
];

function toNavItem(entry: DocEntry): NavItem {
	return { title: entry.title, slug: entry.slug, section: entry.section };
}

export function findDoc(slug: string): DocEntry | undefined {
	return DOC_ENTRIES.find((d) => d.slug === slug);
}

/** Previous/next within the whole reading order, so the rail never dead-ends. */
export function neighbours(slug: string): { prev?: DocEntry; next?: DocEntry } {
	const index = DOC_ENTRIES.findIndex((d) => d.slug === slug);
	if (index === -1) return {};
	return {
		prev: DOC_ENTRIES[index - 1],
		next: DOC_ENTRIES[index + 1]
	};
}

export const FIRST_DOC = DOC_ENTRIES[0];