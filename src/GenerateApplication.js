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
   * Encode a string, removing any special characters from it.
   * @param {string} name Displayed model name.
   * @returns {string} Lowercase name withow spaces or special characters.
   */
  encodeName (name) {
    return name.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9_-]/g, '');
  }

  /**
   * Add names to an HTML document element.
   * @param {Element} container The document element where names will be added.
   * @param {Array} names Array containing the names that should be added.
   * @param {string('name' | 'surname' | 'fullName')} type The type of names contained in the array.
   */
  addNames (container, names, type) {
    container.replaceChildren();

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
        const actor = this.sheet.actor;
        anchor.addEventListener('click', async () => {
          const newName = type === 'surname' ? `${actor.name} ${name}` : name;
          await actor.update({ name: newName });
          ui.notifications.info(game.i18n.localize('NAMEFORGE.GENERATE.actorUpdated'));
        });
      }
      container.appendChild(anchor);
    });
  }

  /**
   * Add an auto name changer to an HTML document element and actor.
   * @param {Element} container The document element where the auto name changer will be added.
   * @param {Object} actor The actor where the auto name changer flag will be set.
   * @param {Object} data Object containing the data used to set the actor flag.
   */
  async addNameChanger (container, actor, data) {
    const encodedName = this.encodeName(data.name);
    await actor.setFlag('nameforge', 'models', {
      ...actor.getFlag('nameforge', 'models'),
      [encodedName]: data
    });

    const anchor = document.createElement('a');
    anchor.classList = 'nf-tag';
    anchor.innerText = data.name;
    anchor.id = encodedName;
    anchor.addEventListener('click', async () => await this.removeNameChanger(actor, anchor));

    const tag = container.querySelector(`#${anchor.id}`);
    if (tag) {
      tag.remove();
      container.appendChild(anchor);
    } else {
      container.appendChild(anchor);
    }
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
    options.width = 800;
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
      config: game.settings.get('nameforge', 'defaultConfig'),
      models: NameForge.filterModels(game.modules.get('nameforge').models),
      show: {
        seed: true,
        temperature: true,
        count: true,
        weight: this.sheet
      }
    };
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/classes/client.Application.html#activateListeners
   */
  async activateListeners (html) {
    const namesContainer = html[0].querySelector('#names');
    const nameChangersContainer = html[0].querySelector('#nameChangers');
    const originalNameContainer = html[0].querySelector('p[name="original"]');
    const form = html[0].querySelector('#nameforge');

    if (this.sheet) {
      const actor = this.sheet.actor;
      const models = actor.getFlag('nameforge', 'models');

      const originalName = document.createElement('a');
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
        nameChangersContainer.appendChild(anchor);
      }
    }

    form.addEventListener('submit', async (event) => {
      await event.preventDefault();

      const nameforge = new NameForge();
      const action = event.submitter.name;
      const formData = new FormData(form);
      const data = {
        name: {
          model: formData.get('nameModel'),
          count: formData.get('nameCount'),
          seed: formData.get('nameSeed'),
          temperature: formData.get('nameTemperature'),
          weight: formData.get('nameWeight'),
          original: form.querySelector('input[name="nameOriginal"]').checked
        },
        surname: {
          model: formData.get('surnameModel'),
          count: formData.get('surnameCount'),
          seed: formData.get('surnameSeed'),
          temperature: formData.get('surnameTemperature'),
          weight: formData.get('surnameWeight'),
          original: form.querySelector('input[name="surnameOriginal"]').checked
        }
      };
      const nameSelect = form.querySelector('select[name="nameModel"]');
      const surnameSelect = form.querySelector('select[name="surnameModel"]');
      const optionText = {
        name: nameSelect.options[nameSelect.selectedIndex].text,
        surname: surnameSelect.options[surnameSelect.selectedIndex].text
      };

      if (data.name.model === 'none' ^ data.surname.model === 'none') {
        const type = data.name.model !== 'none' ? 'name' : 'surname';
        const options = {
          count: data[type].count,
          original: data[type].original,
          seed: data[type].seed,
          temperature: data[type].temperature
        };

        if (action === 'generate') {
          const model = await nameforge.createModel({ path: data[type].model });
          const names = nameforge.generateName(model, options);
          this.addNames(namesContainer, names, type);
        } else if (action === 'add') {
          this.addNameChanger(nameChangersContainer, this.sheet.actor, {
            name: optionText[type],
            model: data[type].model,
            options,
            type,
            weight: data[type].weight
          });
        }
      } else if (data.name.model !== 'none' && data.surname.model !== 'none') {
        const options = {
          name: {
            count: data.name.count,
            seed: data.name.seed,
            temperature: data.name.temperature
          },
          surname: {
            count: data.surname.count,
            seed: data.surname.seed,
            temperature: data.surname.temperature
          }
        };

        if (action === 'generate') {
          const nameModel = await nameforge.createModel({ path: data.name.model });
          const surnameModel = await nameforge.createModel({ path: data.surname.model });
          const names = nameforge.generateFullName(nameModel, surnameModel, options);
          this.addNames(namesContainer, names, 'fullName');
        } else if (action === 'add') {
          this.addNameChanger(nameChangersContainer, this.sheet.actor, {
            name: `${optionText.name}/${optionText.surname}`,
            model: { name: data.name.model, surname: data.surname.model },
            options,
            type: 'fullName',
            weight: data.name.weight
          });
        }
      }
      super.setPosition({ height: 'auto' });
    });
  }
}
