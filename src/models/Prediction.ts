export interface Prediction {
  matchId: string;
  userId: string;
  prediction: string;
  submittedAt: string;
  // optional numeric score prediction used by points calculation
  predictedScore?: number;
}