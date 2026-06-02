import { Leaderboard } from '../models/Leaderboard';

export const getLeaderboard = async (): Promise<Leaderboard[]> => {
  return [
    { userId: 'user-1', username: 'Player1', points: 180 },
  ];
};
