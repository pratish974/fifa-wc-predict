import { Leaderboard } from '../models/Leaderboard';
import { getAllUsers } from './userService';

export const getLeaderboard = async (): Promise<Leaderboard[]> => {
  try {
    const users = await getAllUsers();

    // Map users to leaderboard rows and sort by points descending
    const rows: Leaderboard[] = users
      .filter(u => (u.role || 'USER').toUpperCase() !== 'ADMIN')
      .map(u => ({
        userId: u.id || '',
        username: u.name,
        points: typeof u.points === 'number' ? u.points : 0,
        playedMatches: typeof u.playedMatches === 'number' ? u.playedMatches : 0,
        wonMatches: typeof u.wonMatches === 'number' ? u.wonMatches : 0,
        lostMatches: typeof u.lostMatches === 'number' ? u.lostMatches : 0,
        tiedMatches: typeof u.tiedMatches === 'number' ? u.tiedMatches : 0,
        notPlayedMatches: typeof u.notPlayedMatches === 'number' ? u.notPlayedMatches : 0
      }))
      .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));

    return rows;
  } catch (err) {
    console.error('getLeaderboard error', err);
    // fallback: empty list
    return [];
  }
};
