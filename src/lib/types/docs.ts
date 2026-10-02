export interface DocMetadata {
	title: string;
	description: string;
	section: string;
	order?: number;
}

export interface NavItem {
	title: string;
	slug: string;
	section: string;
}

/** A sidebar group. Order is explicit so the rail never reshuffles itself. */
export interface NavSection {
	title: string;
	items: NavItem[];
}

/**
 * A search hit. `section` is carried through so a result can show where it sits
 * in the documentation rather than floating free.
 */
export interface SearchHit extends NavItem {
	/** Plain-text excerpt around the match, for the result row. */
	excerpt: string;
}

/** Row rendered inside the terminal band. Values map to the DESIGN.md semantic ramp. */
export type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';