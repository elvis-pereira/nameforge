export default class UploadMenu extends FormApplication {
  /**
   * @override
   * @see https://foundryvtt.com/api/interfaces/client.ApplicationOptions.html
   */
  static get defaultOptions () {
    const options = super.defaultOptions;
    options.closeOnSubmit = false;
    options.template = 'modules/nameforge/templates/upload-menu.hbs';
    options.width = 600;
    options.resizable = true;
    options.title = game.i18n.localize('NAMEFORGE.TITLE.upload');

    return options;
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/classes/client.FormApplication.html#_updateObject
   */
  async _updateObject (event, formData) {
    if (event.type === 'submit') {
      const file = event.currentTarget[2].files[0];
      const modelName = formData.name.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9_-]/g, '');
      const response = await fetch('nameforge-models/models.json');
      const userModels = await response.json();
      userModels[modelName] = { name: formData.name, path: `nameforge-models/${file.name}`, type: formData.type };

      await FilePicker.upload('data', 'nameforge-models', file);
      await FilePicker.upload('data', 'nameforge-models', new File([JSON.stringify(userModels, null, 2)], 'models.json', { type: 'application/json' }), {}, { notify: false });

      game.modules.get('nameforge').models.userModels[file.name] = { name: formData.name, path: `nameforge-models/${file.name}`, type: formData.type };
    }
  }
}
