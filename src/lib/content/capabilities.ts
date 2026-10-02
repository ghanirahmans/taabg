/**
 * Every value on this page is transcribed from the repository: the portal list
 * and its semaphore limits from AGENTS.md section 2, the fuzzy thresholds from
 * internal/keywords, the command shapes from docs/HANDBOOK.md. Nothing here is
 * an invented capability or an invented number.
 */

export interface Portal {
	name: string;
	/** What this portal is actually used for on the job. */
	role: string;
	/** Checks reachable through it. */
	checks: string[];
	/** Parallel sessions allowed, from the AGENTS.md semaphore table. */
	limit: number;
	/** Why the limit is what it is. */
	limitReason: string;
}

export const PORTALS: Portal[] = [
	{
		name: 'Gladius',
		role: 'Customer radius profile',
		checks: ['EMBASSY'],
		limit: 2,
		limitReason: 'Two sessions, because login is the fragile part'
	},
	{
		name: 'ProMan',
		role: 'ODP lookup and ticket creation',
		checks: ['UMAS', 'CREATE TICKET'],
		limit: 1,
		limitReason: 'Strict single tab, the portal rejects a second one'
	},
	{
		name: 'IBooster',
		role: 'ONU measurement and Jam Mati detection',
		checks: ['UMAS', 'JAM MATI'],
		limit: 1,
		limitReason: 'Measurement is destructive to the previous reading'
	},
	{
		name: 'ACSIS',
		role: 'ONT serial number check',
		checks: ['ACS ONT'],
		limit: 1,
		limitReason: 'Shared ACS pool, one session at a time'
	},
	{
		name: 'Finpay',
		role: 'Indihome billing',
		checks: ['CEK PAYMENT'],
		limit: 2,
		limitReason: 'Read-only, safe to pair'
	}
];

/**
 * The request path is a real sequence, so it is numbered. Stages are named
 * after the Go packages that implement them, not invented step titles.
 */
export interface PipelineStage {
	stage: string;
	package: string;
	detail: string;
}

export const PIPELINE: PipelineStage[] = [
	{
		stage: 'Read',
		package: 'router',
		detail: 'Nearest-command match on the message, noise filtered out first'
	},
	{
		stage: 'Queue',
		package: 'queue',
		detail: 'FIFO with a 30s dedup window so a double tap runs once'
	},
	{
		stage: 'Gate',
		package: 'scraping',
		detail: 'Per-portal semaphore blocks work at capacity instead of overloading'
	},
	{
		stage: 'Drive',
		package: 'browser',
		detail: 'One shared Chromium, a page per job, closed on the way out'
	},
	{
		stage: 'Reply',
		package: 'worker',
		detail: 'Result and screenshot to the group, errors to the debug group'
	}
];

/** Direct-reply commands from internal/command/catalog.go (ADR 0013). */
export interface DirectCommand {
	command: string;
	aliases: string;
	does: string;
}

export const DIRECT_COMMANDS: DirectCommand[] = [
	{ command: 'taabg help', aliases: 'bantuan, menu, ?', does: 'List every direct-reply command' },
	{ command: 'taabg status', aliases: 'monitoring, dashboard', does: 'System and queue snapshot' },
	{ command: 'taabg ping', aliases: '', does: 'Connection test, replies pong' },
	{ command: 'taabg login gladius', aliases: 'signin', does: 'Start Gladius login and send the captcha' },
	{ command: 'taabg hello', aliases: 'hi, hey, halo, hai', does: 'Greet the bot back' }
];

/**
 * The filter is the part of this bot nobody else has: it stays silent on almost
 * everything. Each row is a rule from AGENTS.md or an ADR, not a feature claim.
 */
export interface Guardrail {
	rule: string;
	source: string;
}

export const GUARDRAILS: Guardrail[] = [
	{
		rule: 'Ordinary chat, ticket-closing templates and negated requests are ignored. Intent has to be explicit.',
		source: 'ADR 0014'
	},
	{
		rule: 'A reply that borrows its target from another message must be a clean command, so a discussion mentioning a keyword stays quiet.',
		source: 'ADR 0036'
	},
	{
		rule: 'When the VPN drops, the bot deletes its own waiting message and pauses the queue rather than reporting an error to the group.',
		source: 'ADR 0002'
	},
	{
		rule: 'Bot tokens, passwords, TOTP secrets and six digit codes are scrubbed to [REDACTED] before anything reaches a log.',
		source: 'AGENTS.md 2.4'
	},
	{
		rule: 'An expired Gladius session asks the debug group for a captcha exactly once, no matter how many jobs are waiting.',
		source: 'AGENTS.md 2.2'
	}
];