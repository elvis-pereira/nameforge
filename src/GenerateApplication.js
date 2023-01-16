import NameForge from './NameForge.js';

export default class GenerateApplication extends Application {
  /**
   * @param {Object} sheet Actor sheet
   */
  constructor (sheet = false) {
    super();
    this.sheet = sheet;
  }

  /**
   * Remove an auto name changer and update actor flag.
   * @param {Object} actor Foundry actor.
   * @param {Element} element HTML element that should be removed.
   */
  async removeNameChanger (actor, element) {
    const modelsFlag = actor.getFlag('nameforge', 'models');
    delete modelsFlag[element.id];
    await actor.unsetFlag('nameforge', 'models');
    await actor.setFlag('nameforge', 'models', modelsFlag);
    element.remove();
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/interfaces/client.ApplicationOptions.html
   */
  static get defaultOptions () {
    const options = super.defaultOptions;
    options.template = 'modules/nameforge/templates/generate-names.hbs';
    options.width = 600;
    options.resizable = true;
    options.title = game.i18n.localize('NAMEFORGE.TITLE.generate');

    return options;
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/classes/client.Application.html#getData
   */
  async getData () {
    return {
      actor: this.sheet ? this.sheet.actor : false,
      models: game.modules.get('nameforge').models
    };
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/classes/client.Application.html#activateListeners
   */
  async activateListeners (html) {
    const namesContainer = html[0].querySelector('#names');
    const actionButtons = html[0].querySelector('#actionButtons');
    const form = html[0].querySelector('#nameforge');

    if (this.sheet) {
      const addButton = document.createElement('button');
      const originalName = document.createElement('a');
      const nameChangers = html[0].querySelector('#nameChangers');
      const originalNameContainer = html[0].querySelector('p[name="original"]');
      const actor = this.sheet.actor;
      const models = actor.getFlag('nameforge', 'models');

      originalName.classList = 'nf-tag';
      originalName.innerText = actor.name;
      originalName.addEventListener('click', async () => await actor.update({ name: originalName.innerText }));
      originalNameContainer.appendChild(originalName);

      for (const key in models) {
        const anchor = document.createElement('a');
        anchor.classList = 'nf-tag';
        anchor.innerText = models[key].name;
        anchor.id = key;
        anchor.addEventListener('click', async () => await this.removeNameChanger(actor, anchor));
        nameChangers.appendChild(anchor);
      }

      addButton.type = 'button';
      addButton.innerText = game.i18n.localize('NAMEFORGE.BUTTON.add');
      addButton.addEventListener('click', async () => {
        const formData = new FormData(form);
        const modelSelect = form.querySelector('select[name="model"]');
        const modelName = modelSelect.options[modelSelect.selectedIndex].text;

        await actor.setFlag('nameforge', 'models', {
          ...actor.getFlag('nameforge', 'models'),
          [modelName.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9_-]/g, '')]: {
            name: modelName,
            model: formData.get('model'),
            options: {
              seed: formData.get('seed'),
              temperature: formData.get('temperature')
            }
          }
        });

        const anchor = document.createElement('a');
        anchor.classList = 'nf-tag';
        anchor.innerText = modelName;
        anchor.id = modelName.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9_-]/g, '');
        anchor.addEventListener('click', async () => await this.removeNameChanger(actor, anchor));
        const tag = nameChangers.querySelector(`#${anchor.id}`);
        if (tag) {
          tag.remove();
          nameChangers.appendChild(anchor);
        } else {
          nameChangers.appendChild(anchor);
        }
      });
      actionButtons.appendChild(addButton);
    }

    form.addEventListener('submit', async (event) => {
      await event.preventDefault();

      const formData = new FormData(form);
      const nameforge = new NameForge();
      const model = await nameforge.createModel({ path: formData.get('model') });
      const names = nameforge.generateName(model, {
        count: formData.get('count'),
        seed: formData.get('seed'),
        temperature: formData.get('temperature')
      });

      namesContainer.replaceChildren();
      names.forEach(name => {
        const anchor = document.createElement('a');
        anchor.classList = 'nf-tag';
        anchor.innerText = name;
        if (!this.sheet) {
          anchor.addEventListener('click', () => {
            navigator.clipboard.writeText(anchor.innerText);
            ui.notifications.info(game.i18n.localize('NAMEFORGE.GENERATE.clipboard'));
          });
        } else if (this.sheet) {
          anchor.addEventListener('click', async () => {
            await this.sheet.actor.update({ name: name });
            ui.notifications.info(game.i18n.localize('NAMEFORGE.GENERATE.actorUpdated'));
          });
        }
        namesContainer.appendChild(anchor);
      });

      super.setPosition({ height: 'auto' });
    });
  }
}
