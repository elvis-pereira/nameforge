import NameForge from './NameForge.js';

const nameforge = new NameForge();

self.onmessage = async (message) => {
  if (message.data.name === 'train') {
    const model = await nameforge.createModel();
    const options = message.data.options;
    const trainingData = nameforge.prepareData(message.data.names);

    options.callbackPeriod = 1;
    options.callback = (details) => {
      self.postMessage({ name: 'progress', details: details, model: JSON.stringify(model.toJSON(), null, 2) });
    };

    nameforge.trainModel(trainingData, model, options);
    self.postMessage({ name: 'complete', model: JSON.stringify(model.toJSON(), null, 2) });
  }
};
