import NameForge from './NameForge.js';

export default class TrainApplication extends Application {
  /**
   * Save model to disk and update models list.
   * @param {string} modelName Display name of the model
   * @param {string} model JSON encoded model.
   */
  async saveModel (modelName, model) {
    const fileName = modelName.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9_-]/g, '');
    const response = await fetch('nameforge-models/models.json');
    const userModels = await response.json();
    userModels[fileName] = { name: modelName, path: `nameforge-models/${fileName}.json` };

    await FilePicker.upload('data', 'nameforge-models', new File([model], `${fileName}.json`, { type: 'application/json' }), {}, { notify: false });
    await FilePicker.upload('data', 'nameforge-models', new File([JSON.stringify(userModels, null, 2)], 'models.json', { type: 'application/json' }));

    game.modules.get('nameforge').models.userModels[fileName] = { name: modelName, path: `nameforge-models/${fileName}.json` };
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/interfaces/client.ApplicationOptions.html
   */
  static get defaultOptions () {
    const options = super.defaultOptions;
    options.template = 'modules/nameforge/templates/train-model.hbs';
    options.width = 600;
    options.resizable = true;
    options.title = game.i18n.localize('NAMEFORGE.TITLE.train');

    return options;
  }

  /**
   * @override
   * @see https://foundryvtt.com/api/classes/client.Application.html#activateListeners
   */
  activateListeners (html) {
    const form = html[0].querySelector('#train-model');
    const submitButton = html[0].querySelector('#train-model button[name="train"]');
    const stopButton = html[0].querySelector('#train-model button[name="stop"]');
    const resultsContainer = html[0].querySelector('#results');
    const namesPreview = html[0].querySelector('#results p');
    const progressBar = document.createElement('progress');
    progressBar.classList = 'nf-progress';

    form.addEventListener('submit', async (event) => {
      await event.preventDefault();

      submitButton.disabled = true;
      stopButton.disabled = false;

      const formData = Object.fromEntries(new FormData(form).entries());
      const { modelName, errorThreshold, iterations, learningRate, timeout, trainingData } = formData;
      const options = {
        ...(timeout > 0 && { timeout: timeout * 60000 }),
        ...(iterations > 0 && { iterations: iterations }),
        ...((learningRate >= 0 && learningRate <= 1) && { learningRate: learningRate }),
        ...((errorThreshold >= 0 && errorThreshold <= 1) && { errorThreshold: errorThreshold })
      };

      progressBar.max = iterations - 1;
      resultsContainer.append(progressBar);

      const worker = new Worker(
        /* webpackChunkName: "worker" */
        new URL('worker.js', import.meta.url)
      );

      stopButton.addEventListener('click', async () => {
        worker.terminate();

        await this.saveModel(modelName, bestIteration.model);

        submitButton.disabled = false;
        stopButton.disabled = true;
      });

      const bestIteration = { number: 0, error: 1, model: null };
      const nameforge = new NameForge();

      worker.postMessage({ name: 'train', options: options, names: trainingData });
      worker.onmessage = async (message) => {
        const { name, details, model } = message.data;
        if (name === 'progress') {
          progressBar.value = details.iterations;

          if (details.error < bestIteration.error) {
            bestIteration.iteration = details.iterations;
            bestIteration.error = details.error;
            bestIteration.model = await nameforge.createModel({ json: model });
            const names = nameforge.generateName(bestIteration.model, { count: 5 });
            namesPreview.innerText = `Best iteration (${bestIteration.iteration}) -> Loss: ${bestIteration.error.toPrecision(2)} | ${names.join(', ')}`;
          }
        }

        if (name === 'complete') {
          await this.saveModel(modelName, model);

          submitButton.disabled = false;
          stopButton.disabled = true;
        }
      };
      worker.onerror = (error) => {
        console.log(`Worker error: ${error.message}`);
        throw error;
      };

      super.setPosition({ height: 'auto' });
    });
  }
}
