import { Prediction } from '../models/Prediction';

export const submitPrediction = async (prediction: Prediction): Promise<void> => {
  console.log('Prediction submitted', prediction);
};
