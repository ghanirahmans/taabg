import { createHighlighter } from 'shiki';

/**
 * One Shiki instance for the whole build, shared between the mdsvex preprocessor
 * and the landing-page server load so grammars are not loaded twice.
 *
 * Docs snippets are highlighted at compile time. The landing-page snippets go
 * through a server-only load, so the highlighter never reaches the browser.
 * `github-dark` matches the Primer dark surfaces in DESIGN.md.
 *
 * Written as JS rather than TS because `svelte.config.js` imports it directly.
 *
 * @type {import('shiki').Highlighter}
 */
const highlighter = await createHighlighter({
	themes: ['github-dark'],
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
	return highlighter.codeToHtml(code.trim(), { lang: grammar, theme: 'github-dark' });
}