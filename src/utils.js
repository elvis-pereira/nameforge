/**
 * Registers the `x-i18n` and `$i18n` directive and magic, respectively, for Alpine.js components.
 * These enable localization of text in HTML files using the Foundry `game.i18n.localize()` method.
 *
 * @import {Alpine} from 'alpinejs'
 * @param {Alpine} alpine Alpine.js instance used to register directives and magic properties.
 * @example
 * // Localize the text of a button
 * <button x-i18n="localization.key"></button>
 *
 * // Localize the placeholder text
 * <input placeholder="$i18n('localization.key')">
 */
export function i18n(alpine) {
	alpine.directive('i18n', (element, { expression }) => {
		element.textContent = game.i18n.localize(expression);
	});

	alpine.magic('i18n', () => {
		return /** @param {string} stringId */ (stringId) => game.i18n.localize(stringId);
	});
}
