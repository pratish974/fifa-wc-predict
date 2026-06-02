import { Prediction } from '../models/Prediction';

export const calculatePoints = (prediction: Prediction): number => {
  return prediction.predictedScore ? 10 : 0;
};
