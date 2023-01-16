import NameForge from './NameForge.js';
import GenerateApplication from './GenerateApplication.js';
import TrainApplication from './TrainApplication.js';

const nameforge = new NameForge();

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
    generateButton.addEventListener('click', async () => new GenerateApplication().render(true));
    if (game.user.hasPermission('FILES_UPLOAD')) {
      footerButtons.insertAdjacentHTML('beforeend', `<button id="train-model"><i class="fas fa-head-side-brain"></i>${game.i18n.localize('NAMEFORGE.BUTTON.train')}</button>`);
      const trainButton = html[0].querySelector('#train-model');
      trainButton.addEventListener('click', async () => new TrainApplication().render(true));
    }
  }
});

Hooks.on('renderDialog', async (dialog, html) => {
  if (dialog.data.title === game.i18n.format('DOCUMENT.Create', { type: game.i18n.localize('DOCUMENT.Actor') })) {
    const models = game.modules.get('nameforge').models;
    const template = await renderTemplate('modules/nameforge/templates/create-new-actor.hbs', models);

    const actorCreateForm = html[0].querySelector('#document-create');
    actorCreateForm.insertAdjacentHTML('afterend', template);

    const dialogButtons = html[0].querySelector('div.dialog-buttons');
    dialogButtons.insertAdjacentHTML('afterbegin', `<button form="nameforge" class="dialog-button default"><i class="fas fa-plus"></i>${game.i18n.localize('NAMEFORGE.BUTTON.generate')}</button>`);

    const form = html[0].querySelector('#nameforge');

    form.addEventListener('submit', async (event) => {
      await event.preventDefault();
      const formData = new FormData(form);
      const model = await nameforge.createModel({ path: formData.get('model') });
      const [name] = nameforge.generateName(model, { seed: formData.get('seed'), temperature: formData.get('temperature') });
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
    onclick: async () => new GenerateApplication(sheet).render(true)
  });
});

Hooks.on('createToken', async (token, data) => {
  const modelsFlag = token.actor.getFlag('nameforge', 'models');
  if (!modelsFlag || Object.keys(modelsFlag || {}).length === 0) {
    return;
  }

  const keys = Object.keys(modelsFlag);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const model = await nameforge.createModel({ path: modelsFlag[key].model });
  const [name] = nameforge.generateName(model, modelsFlag[key].options);

  console.log(name);

  token.update({ name: name });
});
