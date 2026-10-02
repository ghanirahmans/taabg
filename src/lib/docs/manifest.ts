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
	/** Canonical document this page was written from. */
	source: { path: string; label: string };
	/** Extra search terms, including the Indonesian words operators type. */
	keywords: string[];
}

export const DOC_ENTRIES: DocEntry[] = [
	{
		title: 'Introduction',
		slug: 'introduction',
		section: 'Getting Started',
		order: 1,
		description: 'What taabg automates across Telkom assurance portals, and who it is for.',
		source: { path: 'README.md', label: 'README.md' },
		keywords: ['overview', 'about', 'ringkasan', 'apa itu', 'bot', 'telegram']
	},
	{
		title: 'Installation',
		slug: 'installation',
		section: 'Getting Started',
		order: 2,
		description: 'Install the binary, write .env, authenticate Telegram, and confirm health.',
		source: { path: 'docs/INSTALLATION.md', label: 'docs/INSTALLATION.md' },
		keywords: ['install', 'setup', 'installer', 'env', 'login', 'doctor', 'path', 'instalasi']
	},
	{
		title: 'Architecture',
		slug: 'architecture',
		section: 'Core Concepts',
		order: 3,
		description: 'Layer boundaries, the request pipeline, and why scraping never imports Telegram.',
		source: { path: 'docs/architecture.md', label: 'docs/architecture.md' },
		keywords: ['architecture', 'layer', 'clean architecture', 'pipeline', 'design', 'arsitektur']
	},
	{
		title: 'Features',
		slug: 'features',
		section: 'Core Concepts',
		order: 4,
		description: 'The five portals, the checks each one backs, and the workarounds they need.',
		source: { path: 'docs/features/README.md', label: 'docs/features/' },
		keywords: ['features', 'portal', 'gladius', 'proman', 'ibooster', 'acsis', 'finpay', 'fitur']
	},
	{
		title: 'Basic Usage',
		slug: 'usage',
		section: 'Guides',
		order: 5,
		description: 'Ask for a check in plain language, or run it from the browser.',
		source: { path: 'docs/HANDBOOK.md', label: 'docs/HANDBOOK.md' },
		keywords: ['usage', 'how to', 'request', 'web cek', 'dashboard', 'cara', 'pakai']
	},
	{
		title: 'Bot Commands',
		slug: 'commands',
		section: 'Guides',
		order: 6,
		description: 'Direct-reply commands, the prefix, and the phrases the bot ignores on purpose.',
		source: { path: 'internal/command/catalog.go', label: 'internal/command/catalog.go' },
		keywords: ['command', 'prefix', 'help', 'status', 'ping', 'login', 'perintah', 'command catalog']
	},
	{
		title: 'Troubleshooting',
		slug: 'troubleshooting',
		section: 'Guides',
		order: 7,
		description: 'Captcha loops, VPN drops, saturated portals, and how to read the log.',
		source: { path: 'docs/OPERATIONS.md', label: 'docs/OPERATIONS.md' },
		keywords: ['troubleshooting', 'error', 'captcha', 'vpn', 'stuck', 'semaphore', 'masalah', 'error']
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