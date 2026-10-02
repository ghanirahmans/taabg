/*
 * Every value on the landing page is something a reader could verify by running the
 * tool: a portal name, a concurrency limit the portal enforces, a check name, a
 * timeout, or a phrase the bot prints.
 *
 * Nothing here cites a source file or a design record number. The bot's repository
 * is private, so `internal/router` and `ADR 0014` were references a reader could not
 * follow, and they took up the space where an explanation belonged.
 */

export interface Portal {
	name: string;
	/** What this portal is actually used for on the job. */
	role: string;
	/** Checks reachable through it. */
	checks: string[];
	/** Parallel sessions the portal tolerates. */
	limit: number;
	/** Why the limit is what it is. */
	limitReason: string;
}

export const PORTALS: Portal[] = [
	{
		name: 'Gladius',
		role: 'Customer line profile and signal',
		checks: ['EMBASSY'],
		limit: 2,
		limitReason: 'Login is the fragile part, not the reading'
	},
	{
		name: 'ProMan',
		role: 'ODP lookup and ticket creation',
		checks: ['UMAS', 'CREATE TICKET'],
		limit: 1,
		limitReason: 'Single tab session, rejects a second outright'
	},
	{
		name: 'IBooster',
		role: 'ONU measurement and dead line detection',
		checks: ['UMAS', 'JAM MATI'],
		limit: 1,
		limitReason: 'A measurement overwrites the previous reading'
	},
	{
		name: 'ACSIS',
		role: 'ONT hardware and data allowance',
		checks: ['ACS ONT', 'CEK FUP'],
		limit: 1,
		limitReason: 'Shared pool, one session at a time'
	},
	{
		name: 'Finpay',
		role: 'IndiHome billing',
		checks: ['CEK PAYMENT'],
		limit: 2,
		limitReason: 'Read only, and needs no credentials at all'
	}
];

/*
 * The request path is a real sequence, so it is numbered. Each stage names what it
 * is responsible for rather than the package that implements it, because the package
 * names are only meaningful to someone who has the source.
 */
export interface PipelineStage {
	stage: string;
	/** What this stage is answerable for. */
	responsibility: string;
	detail: string;
}

export const PIPELINE: PipelineStage[] = [
	{
		stage: 'Read',
		responsibility: 'Is this even a request',
		detail: 'Nearest-check match on the message, noise and negation filtered out first'
	},
	{
		stage: 'Queue',
		responsibility: 'Wait here',
		detail: 'First in first out, 50 deep, with a 30s window that runs a double tap once'
	},
	{
		stage: 'Gate',
		responsibility: 'Wait here too',
		detail: 'Per-portal limit blocks work at capacity instead of overloading the portal'
	},
	{
		stage: 'Drive',
		responsibility: 'Do the work',
		detail: 'One shared Chromium, a page per job, closed on the way out'
	},
	{
		stage: 'Reply',
		responsibility: 'Say what happened',
		detail: 'Result and screenshot to the group, everything technical to the debug group'
	}
];

export interface DirectCommand {
	command: string;
	aliases: string;
	does: string;
}

export const DIRECT_COMMANDS: DirectCommand[] = [
	{ command: 'taabg help', aliases: 'bantuan, menu, ?', does: 'List every direct command' },
	{ command: 'taabg status', aliases: 'monitoring, dashboard', does: 'System and queue snapshot' },
	{ command: 'taabg ping', aliases: '', does: 'Connection test, replies pong' },
	{ command: 'taabg login gladius', aliases: 'signin', does: 'Start a Gladius login and send the captcha' },
	{ command: 'taabg hello', aliases: 'hi, hey, halo, hai', does: 'Greet the bot back' }
];

/*
 * The filter is the part of this bot nobody else has: it stays silent on almost
 * everything. Each row below is a rule the tool actually applies, phrased as what it
 * means for a person in the group rather than as a citation.
 */
export interface Guardrail {
	rule: string;
	/** The failure it prevents, which is the reason the rule exists. */
	why: string;
}

export const GUARDRAILS: Guardrail[] = [
	{
		rule: 'A keyword inside a sentence is not a request. So is a check name with no target, a negated one, or a message that reads like a case report.',
		why: 'A wrong answer costs a portal session and the group trust'
	},
	{
		rule: 'A reply may borrow its target from the message it answers, but only if the reply itself is nothing but the command.',
		why: 'Discussion and instructions look identical in a busy group'
	},
	{
		rule: 'When the VPN drops the bot deletes its own waiting message and pauses the queue instead of reporting an error to the group.',
		why: 'Four of five portals are internal, and a link outage is ordinary'
	},
	{
		rule: 'Bot tokens, passwords, second factor secrets and API hashes are replaced before anything reaches a log.',
		why: 'The log outlives the terminal it was written in'
	},
	{
		rule: 'An expired Gladius session asks the debug group for a captcha exactly once, no matter how many jobs are waiting behind it.',
		why: 'Twenty queued jobs asking separately would expire the session again'
	}
];
