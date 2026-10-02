import type { LogLevel } from '#lib/types/docs';

/**
 * The terminal band is the dashboard's identity motif (DESIGN.md L5), so the
 * landing page leads with it too. Lines below are reconstructions of the real
 * console format written by `internal/utils/logger.go`:
 *
 *   [15:04:05] [INFO ] [a3f9c2d1] [gladius] message
 *
 * They are illustrative, not a captured session, and the band says so on screen.
 */
export interface LogLine {
	time: string;
	level: LogLevel;
	trace: string;
	component: string;
	message: string;
}

export interface Transcript {
	id: string;
	/** The exact text a technician types in the Telegram group. */
	prompt: string;
	caption: string;
	lines: LogLine[];
}

export const TRANSCRIPTS: Transcript[] = [
	{
		id: 'umas',
		prompt: 'umas ODP-MDC-FAY/015',
		caption: 'One ODP, both portals. ProMan resolves the ODP, IBooster measures every ONU behind it.',
		lines: [
			{ time: '14:32:07', level: 'INFO', trace: 'a3f9c2d1', component: 'router', message: 'match UMAS 0.91 -> #4471 queued' },
			{ time: '14:32:07', level: 'INFO', trace: 'a3f9c2d1', component: 'queue', message: 'dedup 30s, no duplicate' },
			{ time: '14:32:08', level: 'INFO', trace: 'a3f9c2d1', component: 'proman', message: 'slot 1/1 acquired' },
			{ time: '14:32:11', level: 'INFO', trace: 'a3f9c2d1', component: 'proman', message: 'odp found: 24 customer, 1 LOS' },
			{ time: '14:32:12', level: 'INFO', trace: 'a3f9c2d1', component: 'ibooster', message: 'slot 1/1 acquired' },
			{ time: '14:32:29', level: 'WARN', trace: 'a3f9c2d1', component: 'worker', message: '1 ONU off: 111213094876, retry' },
			{ time: '14:32:44', level: 'INFO', trace: 'a3f9c2d1', component: 'worker', message: 'done 37.2s, reply + screenshot' },
			{ time: '14:32:44', level: 'INFO', trace: 'a3f9c2d1', component: 'proman', message: 'slot released' }
		]
	},
	{
		id: 'embassy',
		prompt: 'embassy 111209141110',
		caption:
			'A Gladius session that needs a human. Only one captcha is ever asked for, and it goes to the debug group, never the technicians channel.',
		lines: [
			{ time: '09:14:51', level: 'INFO', trace: '77c0e4b2', component: 'router', message: 'match EMBASSY 0.93 -> request #4102 queued' },
			{ time: '09:14:51', level: 'INFO', trace: '77c0e4b2', component: 'gladius', message: 'slot 1/2 acquired, session expired' },
			{ time: '09:14:52', level: 'WARN', trace: '77c0e4b2', component: 'gladius', message: 'captcha required, single-flight lock held' },
			{ time: '09:14:52', level: 'INFO', trace: '77c0e4b2', component: 'debug_bot', message: 'captcha sent to debug group, request parked' },
			{ time: '09:17:03', level: 'INFO', trace: '77c0e4b2', component: 'gladius', message: 'captcha solved, session restored' },
			{ time: '09:17:19', level: 'INFO', trace: '77c0e4b2', component: 'gladius', message: 'radius ok, telsel 2,LOS 0,OLT-ACCESS-17' },
			{ time: '09:17:19', level: 'INFO', trace: '77c0e4b2', component: 'worker', message: 'done 148.0s, reply to group + screenshot' }
		]
	},
	{
		id: 'vpn',
		prompt: 'VPN link drops mid-run',
		caption:
			'When the internal VPN goes away the bot clears its own waiting message and holds the queue instead of filling the group with stack traces.',
		lines: [
			{ time: '21:02:10', level: 'INFO', trace: '1d5b8fa0', component: 'vpn', message: 'globalprotect unreachable, 3 probes' },
			{ time: '21:02:14', level: 'WARN', trace: '1d5b8fa0', component: 'vpn', message: 'link down, queue paused' },
			{ time: '21:02:14', level: 'INFO', trace: '1d5b8fa0', component: 'bot', message: 'waiting message bntr deleted from group' },
			{ time: '21:02:15', level: 'INFO', trace: '1d5b8fa0', component: 'worker', message: 'running task #4502 held, no public error' },
			{ time: '21:09:41', level: 'INFO', trace: '1d5b8fa0', component: 'vpn', message: 'link restored, queue resumed' },
			{ time: '21:09:41', level: 'INFO', trace: '1d5b8fa0', component: 'worker', message: 'task #4502 released to queue' }
		]
	}
];