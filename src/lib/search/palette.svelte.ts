/**
 * Palette open state lives in a module so the navbar button, the mobile menu row
 * and the ⌘K shortcut all drive one dialog instead of threading props through two
 * layouts.
 */
class Palette {
	open = $state(false);

	show() {
		this.open = true;
	}

	hide() {
		this.open = false;
	}

	toggle() {
		this.open = !this.open;
	}
}

export const palette = new Palette();