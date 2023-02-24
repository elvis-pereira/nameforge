import NameForge from './NameForge.js';

export default class ConfigMenu extends FormApplication {
  /**
   * @override
   * @see https://foundryvtt.com/api/interfaces/client.ApplicationOptions.html
   */
  static get defaultOptions () {
    const options = super.defaultOptions;
    options.closeOnSubmit = false;
    options.template = 'modules/nameforge/templates/config-menu.hbs';
    options.width = 600;
    options.resizable = true;
    options.title = game.i18n.localize('NAMEFORGE.TITLE.config');

    return options;
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/classes/client.Application.html#getData
   */
  async getData () {
    return {
      config: game.settings.get('nameforge', 'defaultConfig'),
      models: NameForge.filterModels(game.modules.get('nameforge').models),
      show: {
        seed: false,
        temperature: true,
        count: true,
        weight: false
      }
    };
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/classes/client.FormApplication.html#_updateObject
   */
  async _updateObject (event, formData) {
    if (event.type === 'submit') {
      const data = {
        name: {
          model: formData.nameModel,
          count: formData.nameCount,
          temperature: formData.nameTemperature
        },
        surname: {
          model: formData.surnameModel,
          count: formData.surnameCount,
          temperature: formData.surnameTemperature
        }
      };

      game.settings.set('nameforge', 'defaultConfig', data);
      ui.notifications.info(game.i18n.localize('NAMEFORGE.SETTINGS.saved'));
    }
  }
}
