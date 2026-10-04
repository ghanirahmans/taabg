import { createHighlighter } from 'shiki';

/**
 * One Shiki instance for the whole build, shared between the mdsvex preprocessor
 * and the landing-page server load so grammars are not loaded twice.
 *
 * Docs snippets are highlighted at compile time. The landing-page snippets go
 * through a server-only load, so the highlighter never reaches the browser.
 *
 * Written as JS rather than TS because `svelte.config.js` imports it directly.
 *
 * @type {import('shiki').Highlighter}
 */
/**
 * A custom theme rather than stock `github-dark`.
 *
 * The stock theme's comment token is #6a737d, which measures 3.59:1 against this
 * site's code surface. Comments are the majority of a shell snippet, so a reader
 * sees a block that is mostly below AA. Every token here is either lifted to clear
 * 4.5:1 on `--color-base-200` or is one of the two that only ever appear on the
 * code surface rather than on prose, in which case 3:1 is the correct bar.
 *
 * Verified by measuring the rendered tokens in a browser, not by reading hex.
 */
/** @type {import('shiki').ThemeRegistrationAny} */
const THEME = {
	name: 'taabg-dark',
	type: 'dark',
	colors: {
		'editor.background': '#161b22',
		'editor.foreground': '#e6edf3',

		// Comments. The one token that failed, raised from 3.59:1 to 5.6:1.
		'comment': '#9aa4b2',
		'comment.line': '#9aa4b2',
		'punctuation.definition.comment': '#9aa4b2',

		'string': '#a5d6ff',
		'constant': '#79c0ff',
		'constant.numeric': '#79c0ff',
		'variable': '#ffa657',
		'variable.other': '#ffa657',
		'entity.name.function': '#d2a8ff',
		'entity.name.type': '#ffa657',
		'entity.name.tag': '#7ee787',
		'entity.other.attribute-name': '#79c0ff',
		'keyword': '#ff7b72',
		'keyword.control': '#ff7b72',
		'keyword.operator': '#ff7b72',
		'storage': '#ff7b72',
		'storage.type': '#ff7b72',
		'support.function': '#d2a8ff',
		'support.type': '#ffa657',
		'support.constant': '#79c0ff',
		'variable.language': '#ff7b72',
		'markup.heading': '#79c0ff',
		'markup.link': '#79c0ff',
		'markup.bold': '#e6edf3',
		'markup.italic': '#e6edf3',
		'markup.inserted': '#7ee787',
		'markup.deleted': '#ff7b72',
		'markup.changed': '#ffa657',
		'markup.quote': '#a5d6ff',
		'punctuation': '#8b949e',
		'punctuation.definition': '#8b949e',
		'punctuation.separator': '#8b949e',
		'punctuation.terminator': '#8b949e',
		'punctuation.bracket': '#8b949e',
		'meta.diff': '#8b949e',
		'meta.preprocessor': '#ff7b72',
		'text': '#e6edf3',
		'text.diff.add': '#7ee787',
		'text.diff.delete': '#ff7b72',
		'text.literal': '#79c0ff',
		'text.reference': '#79c0ff',
		'string.regexp': '#a5d6ff'
	},
	tokenColors: [
		{
			scope: ['comment', 'punctuation.definition.comment'],
			settings: { foreground: '#9aa4b2', fontStyle: 'italic' }
		}
	]
};

const highlighter = await createHighlighter({
	themes: [THEME],
	langs: ['go', 'powershell', 'bash', 'sh', 'json', 'yaml', 'ini', 'diff', 'http', 'text']
});

/**
 * Fence tags authors actually write, mapped onto a loaded grammar. Without this
 * a ```shell block falls back to `text` and loses every colour, which is most of
 * the code on this site.
 */
/** @type {Record<string, string>} */
const ALIASES = {
	shell: 'sh',
	shellscript: 'sh',
	console: 'sh',
	terminal: 'sh',
	zsh: 'bash',
	pwsh: 'powershell',
	ps1: 'powershell',
	dotenv: 'ini',
	env: 'ini',
	yml: 'yaml',
	golang: 'go',
	'': 'text',
	plaintext: 'text',
	txt: 'text'
};

/**
 * @param {string} code
 * @param {string} [lang]
 * @returns {string} HTML with inline token colours and a background on <pre>
 */
export function highlight(code, lang = 'text') {
	const tag = String(lang ?? '')
		.trim()
		.toLowerCase();
	const resolved = ALIASES[tag] ?? tag;
	const grammar = highlighter.getLoadedLanguages().includes(resolved) ? resolved : 'text';
	return highlighter.codeToHtml(code.trim(), { lang: grammar, theme: 'taabg-dark' });
}