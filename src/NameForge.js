export default class NameForge {
  /**
   * Prepare the data needed to train a model from the provided list of names.
   * @param {string} listOfNames A list of names separated by a comma (",").
   * @returns {Array} Array containing each name in the list.
   */
  prepareData (listOfNames) {
    if (!listOfNames || listOfNames?.length === 0) {
      throw new Error('Provided list don\'t contain any names.');
    }

    const names = [...new Set(listOfNames.toLowerCase().split(','))].sort();

    if (names.length === 1) {
      throw new Error('The list is too short');
    }

    return names.map(name => name.trim());
  }

  /**
   * A brain.js neural network used for training and inference.
   * @typedef {Object} NeuralNetwork
   */

  /**
   * Create a brain.js LSTM model to be used later.
   * @param {Object} options Path to JSON file or string containing a pre-trained model.
   * @returns {(NeuralNetwork|null)} A new model or pre-trained model (null if not found).
   */
  async createModel (options = { path: null, json: null }) {
    const { recurrent } = await import('brain.js');
    const model = new recurrent.LSTM({
      activation: 'tanh'
    });

    if (options.path) {
      const response = await fetch(options.path);
      if (response.ok) {
        model.fromJSON(await response.json());
        return model;
      }
      return null;
    }

    if (options.json) {
      model.fromJSON(JSON.parse(options.json));
    }

    return model;
  }

  /**
   * Train a model in a list of names to be later used for predictions.
   * @param {Array} trainingData Array of names that the model will be trained on.
   * @param {NeuralNetwork} model Brain.js model to train data on.
   * @param {Object} userOptions User supplied option to fine tune the training.
   * @returns {NeuralNetwork} The trained brain.js model.
   */
  trainModel (trainingData, model, userOptions = {}) {
    const options = {
      iterations: 500,
      errorThreshold: 0.10,
      callback: null,
      callbackPeriod: 10,
      learningRate: 0.01,
      timeout: 'Infinity',
      ...userOptions
    };

    const result = model.train(trainingData, options);

    console.info(`Training completed after ${result.iterations} iterations, loss ${result.error}`);

    return model;
  }

  /**
   * Get a list of available pre-trained models to be used.
   * @returns {Object} An object containing each pre-trained model.
   */
  static async getModels () {
    const models = {
      userModels: null,
      defaultModels: null
    };

    const userModels = await fetch('nameforge-models/models.json');
    const defaultModels = await fetch('modules/nameforge/models/models.json');

    if (userModels.ok) {
      models.userModels = await userModels.json();
    }

    if (defaultModels.ok) {
      models.defaultModels = await defaultModels.json();
    }

    return models;
  }

  /**
   * Filter models by type.
   * @param {Object} models Object containing all the grouped models.
   * @returns {Object} An object containing the grouped models separated by type.
   */
  static filterModels (models) {
    return {
      userModels: {
        names: Object.values(models.userModels).filter(model => !model?.type || model?.type === 'name'),
        surnames: Object.values(models.userModels).filter(model => model?.type === 'surname')
      },
      defaultModels: {
        names: Object.values(models.defaultModels).filter(model => !model?.type || model?.type === 'name'),
        surnames: Object.values(models.defaultModels).filter(model => model?.type === 'surname')
      }
    };
  }

  /**
   * Simple or weighted random selection.
   * @param {Array} data Array with the possible options that can be selected.
   * @returns The randomly selected entry.
   */
  selectRandom (data) {
    const entries = data.map(entry => {
      const weight = entry?.weight ?? 1;
      return { ...entry, ...{ weight: weight } };
    });

    const weightSum = entries.reduce((accumulator, entry) => accumulator + Number(entry.weight), 0);
    let selectedWeight = Math.random() * weightSum;

    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];

      if (selectedWeight < entry.weight) {
        return entry;
      }

      selectedWeight -= entry.weight;
    }
  }

  /**
   * Capitalize the first letter of a string (with internationalization support).
   * @param {string} string A string to be capitalized.
   * @param {string} locale Language code used to define the correct capitalization.
   * @returns {string} The capitalized string.
   * @see https://stackoverflow.com/a/53930826/38522
   */
  capitalize (string, locale = game.i18n.lang) {
    const [firstLetter, ...rest] = string;
    return firstLetter === undefined ? '' : firstLetter.toLocaleUpperCase(locale) + rest.join('');
  }

  /**
   * Generate one or more names using the supplied model.
   * @param {NeuralNetwork} model Pre-trained model that will be used for predictions.
   * @param {Object} userOptions User supplied option to fine tune predictions.
   * @returns {Array} An array with each predicted name.
   */
  generateName (model, userOptions = {}) {
    const options = {
      count: 1,
      seed: '',
      temperature: 1,
      ...userOptions
    };

    if (options.temperature <= 0 || isNaN(options.temperature)) {
      options.temperature = 1;
    }

    if (options.count > 1) {
      const names = new Set();

      while (names.size < options.count) {
        names.add(this.capitalize(options.seed + model.run(options.seed.toLowerCase(), true, options.temperature)));
      }

      return Array.from(names);
    }

    const name = this.capitalize(options.seed + model.run(options.seed.toLowerCase(), true, options.temperature));

    return [name];
  }

  /**
   * Generate one or more full names using the supplied models.
   * @param {NeuralNetwork} nameModel Pre-trained model that will be used to predict names.
   * @param {NeuralNetwork} surnameModel Pre-trained model that will be used to predict surnames.
   * @param {Object} userOptions User supplied option to fine tune predictions.
   * @returns {Array} An array with each predicted full name.
   */
  generateFullName (nameModel, surnameModel, userOptions = { name: {}, surname: {} }) {
    const options = {
      name: {
        count: 1,
        seed: '',
        temperature: 1,
        ...userOptions.name
      },
      surname: {
        count: 1,
        seed: '',
        temperature: 1,
        ...userOptions.surname
      }
    };

    const names = this.generateName(nameModel, options.name);
    const fullNames = names.map(name => {
      const surnameCount = Math.round(Math.random() * (options.surname.count - 1) + 1);
      const surnames = this.generateName(surnameModel, { ...options.surname, ...{ count: surnameCount } });
      return `${name} ${surnames.join(' ')}`;
    });

    return fullNames;
  }
}
