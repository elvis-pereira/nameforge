import NameForge from './NameForge.js';
import GenerateApplication from './GenerateApplication.js';
import TrainApplication from './TrainApplication.js';
import ConfigMenu from './ConfigMenu.js';

const nameforge = new NameForge();

Hooks.once('init', () => {
  game.settings.register('nameforge', 'defaultConfig', {
    scope: 'client',
    config: false,
    requiresReload: false,
    type: Object,
    default: {
      name: {
        model: null,
        temperature: 1,
        count: 1
      },
      surname: {
        model: 'none',
        temperature: 1,
        count: 1
      }
    }
  });

  game.settings.registerMenu('nameforge', 'defaultConfigMenu', {
    name: game.i18n.localize('NAMEFORGE.SETTINGS.name'),
    label: game.i18n.localize('NAMEFORGE.SETTINGS.label'),
    hint: game.i18n.localize('NAMEFORGE.SETTINGS.hint'),
    icon: 'fas fa-wrench',
    type: ConfigMenu,
    restricted: false
  });

  loadTemplates([
    'modules/nameforge/templates/partials/generate-options.hbs'
  ]);
});

Hooks.on('ready', async () => {
  if (game.user.hasPermission('FILES_UPLOAD') && game.user.hasPermission('FILES_BROWSE')) {
    try {
      await FilePicker.createDirectory('data', 'nameforge-models');
    } catch (error) {
      console.log('Folder already exists, skipping creation');
    }

    const { files } = await FilePicker.browse('data', 'nameforge-models');
    if (!files.includes('nameforge-models/models.json')) {
      await FilePicker.upload('data', 'nameforge-models', new File([JSON.stringify({}, null, 2)], 'models.json', { type: 'application/json' }), {}, { notify: false });
    }
  }

  game.modules.get('nameforge').api = new NameForge();
  game.modules.get('nameforge').models = await NameForge.getModels();
});

Hooks.on('renderSidebarTab', (sidebar, html) => {
  if (sidebar.options.id === 'actors') {
    const footerButtons = html[0].querySelector('footer.directory-footer.action-buttons');
    footerButtons.insertAdjacentHTML('afterbegin', `<button id="generate-names"><i class="fas fa-plus"></i>${game.i18n.localize('NAMEFORGE.BUTTON.generate')}</button>`);

    const generateButton = html[0].querySelector('#generate-names');
    generateButton.addEventListener('click', () => new GenerateApplication().render(true));
    if (game.user.hasPermission('FILES_UPLOAD')) {
      footerButtons.insertAdjacentHTML('beforeend', `<button id="train-model"><i class="fas fa-head-side-brain"></i>${game.i18n.localize('NAMEFORGE.BUTTON.train')}</button>`);
      const trainButton = html[0].querySelector('#train-model');
      trainButton.addEventListener('click', () => new TrainApplication().render(true));
    }
  }
});

Hooks.on('renderDialog', async (dialog, html) => {
  if (dialog.data.title === game.i18n.format('DOCUMENT.Create', { type: game.i18n.localize('DOCUMENT.Actor') })) {
    const models = NameForge.filterModels(game.modules.get('nameforge').models);
    const template = await renderTemplate('modules/nameforge/templates/create-new-actor.hbs', {
      config: game.settings.get('nameforge', 'defaultConfig'),
      models: models,
      show: {
        seed: true,
        temperature: false,
        count: false,
        weight: false
      }
    });

    const actorCreateForm = html[0].querySelector('#document-create');
    actorCreateForm.insertAdjacentHTML('afterend', template);

    const dialogButtons = html[0].querySelector('div.dialog-buttons');
    dialogButtons.insertAdjacentHTML('afterbegin', `<button form="nameforge" class="dialog-button default"><i class="fas fa-plus"></i>${game.i18n.localize('NAMEFORGE.BUTTON.generate')}</button>`);

    const form = html[0].querySelector('#nameforge');

    form.addEventListener('submit', async (event) => {
      await event.preventDefault();
      const formData = new FormData(form);
      let name;

      const data = {
        name: {
          model: formData.get('nameModel'),
          seed: formData.get('nameSeed'),
          temperature: formData.get('nameTemperature')
        },
        surname: {
          model: formData.get('surnameModel'),
          seed: formData.get('surnameSeed'),
          temperature: formData.get('surnameTemperature')
        }
      };

      if (data.name.model === 'none' ^ data.surname.model === 'none') {
        const type = data.name.model !== 'none' ? 'name' : 'surname';
        const options = {
          count: data[type].count,
          seed: data[type].seed,
          temperature: data[type].temperature
        };
        const model = await nameforge.createModel({ path: data[type].model });
        name = nameforge.generateName(model, options);
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

        const nameModel = await nameforge.createModel({ path: data.name.model });
        const surnameModel = await nameforge.createModel({ path: data.surname.model });
        [name] = nameforge.generateFullName(nameModel, surnameModel, options);
      }

      const nameInput = html[0].querySelector('input[name="name"]');
      nameInput.value = name;
    });

    dialog.setPosition({ height: 'auto' });
  }
});

Hooks.on('getActorSheetHeaderButtons', (sheet, buttons) => {
  buttons.unshift({
    label: 'NameForge',
    class: 'nameforge',
    icon: 'fas fa-user-edit',
    onclick: () => new GenerateApplication(sheet).render(true)
  });
});

Hooks.on('createToken', async (token, data) => {
  const modelsFlag = token.actor.getFlag('nameforge', 'models');
  if (!modelsFlag || Object.values(modelsFlag || {}).length === 0) {
    return;
  }

  const drawnEntry = nameforge.selectRandom(Object.values(modelsFlag));
  const type = drawnEntry?.type ?? 'name';
  let tokenName;

  if (type === 'fullName') {
    const nameModel = await nameforge.createModel({ path: drawnEntry.model.name });
    const surnameModel = await nameforge.createModel({ path: drawnEntry.model.surname });
    [tokenName] = nameforge.generateFullName(nameModel, surnameModel, drawnEntry.options);
  } else if (type === 'name' || type === 'surname') {
    const model = await nameforge.createModel({ path: drawnEntry.model });

    if (type === 'name') {
      delete drawnEntry.options.count;
      [tokenName] = nameforge.generateName(model, drawnEntry.options);
    } else {
      const surname = nameforge.generateName(model, drawnEntry.options).join(' ');
      tokenName = `${token.name} ${surname}`;
    }
  }

  token.update({ name: tokenName });
});
