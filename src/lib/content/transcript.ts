import type { LogLevel } from '#lib/types/docs';

/**
 * The terminal band is the dashboard's identity motif (DESIGN.md L5), so the
 * landing page leads with it too.
 *
 * The format below is the real console format: four padded columns, time, level,
 * an eight character task id, an eight character component, then the message.
 * Levels are the four the logger emits, DEBUG, INFO, WARN and ERROR.
 *
 * The lines are reconstructions of that format, not a captured session, and the
 * band says so on screen. Identifiers are placeholders with the right shape, a
 * 12 digit internet number and an ODP code, so the examples parse as real
 * requests while belonging to nobody.
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
		prompt: 'umas ODP-XXX-YY/001',
		caption:
			'One ODP, two portals. ProMan resolves the cabinet into the lines behind it, then IBooster measures them.',
		lines: [
			{ time: '14:32:07', level: 'INFO', trace: 'a3f9c2d1', component: 'router', message: 'match UMAS 0.91 -> #4471 queued' },
			{ time: '14:32:07', level: 'INFO', trace: 'a3f9c2d1', component: 'queue', message: 'dedup 30s, no duplicate' },
			{ time: '14:32:08', level: 'INFO', trace: 'a3f9c2d1', component: 'proman', message: 'slot 1/1 acquired' },
			{ time: '14:32:11', level: 'INFO', trace: 'a3f9c2d1', component: 'proman', message: 'odp found: 24 customer, 1 LOS' },
			{ time: '14:32:12', level: 'INFO', trace: 'a3f9c2d1', component: 'ibooster', message: 'slot 1/1 acquired' },
			{ time: '14:32:29', level: 'WARN', trace: 'a3f9c2d1', component: 'worker', message: '1 ONU off: 100000000013, retry' },
			{ time: '14:32:44', level: 'INFO', trace: 'a3f9c2d1', component: 'worker', message: 'done 37.2s, reply + screenshot' },
			{ time: '14:32:44', level: 'INFO', trace: 'a3f9c2d1', component: 'proman', message: 'slot released' }
		]
	},
	{
		id: 'embassy',
		prompt: 'embassy 100000000011',
		caption:
			'A Gladius session that needs a person. One captcha is ever asked for, and it goes to the debug group, never to the technicians channel.',
		lines: [
			{ time: '09:14:51', level: 'INFO', trace: '77c0e4b2', component: 'router', message: 'match EMBASSY 0.93 -> #4102 queued' },
			{ time: '09:14:51', level: 'INFO', trace: '77c0e4b2', component: 'gladius', message: 'slot 1/2 acquired, session expired' },
			{ time: '09:14:52', level: 'WARN', trace: '77c0e4b2', component: 'gladius', message: 'captcha required, lock held' },
			{ time: '09:14:52', level: 'INFO', trace: '77c0e4b2', component: 'debug_bot', message: 'captcha sent to debug group' },
			{ time: '09:17:03', level: 'INFO', trace: '77c0e4b2', component: 'gladius', message: 'captcha solved, session back' },
			{ time: '09:17:19', level: 'INFO', trace: '77c0e4b2', component: 'gladius', message: 'radius ok, telsel 2, LOS 0' },
			{ time: '09:17:19', level: 'INFO', trace: '77c0e4b2', component: 'worker', message: 'done 148.0s, reply + screenshot' }
		]
	},
	{
		id: 'vpn',
		prompt: 'VPN link drops mid-run',
		caption:
			'When the internal link goes away the bot clears its own waiting message and holds the queue, instead of filling the group with connection errors.',
		lines: [
			{ time: '21:02:10', level: 'INFO', trace: '1d5b8fa0', component: 'vpn', message: 'unreachable, 3 probes' },
			{ time: '21:02:14', level: 'WARN', trace: '1d5b8fa0', component: 'vpn', message: 'link down, queue paused' },
			{ time: '21:02:14', level: 'INFO', trace: '1d5b8fa0', component: 'bot', message: 'waiting message bntr deleted' },
			{ time: '21:02:15', level: 'INFO', trace: '1d5b8fa0', component: 'worker', message: 'task #4502 held, no error' },
			{ time: '21:09:41', level: 'INFO', trace: '1d5b8fa0', component: 'vpn', message: 'link restored, queue resumed' },
			{ time: '21:09:41', level: 'INFO', trace: '1d5b8fa0', component: 'worker', message: 'task #4502 released to queue' }
		]
	}
];
