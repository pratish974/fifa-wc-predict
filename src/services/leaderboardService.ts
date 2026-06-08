import { Leaderboard } from '../models/Leaderboard';
import { getAllUsers } from './userService';

export const getLeaderboard = async (): Promise<Leaderboard[]> => {
  try {
    const users = await getAllUsers();

    // Map users to leaderboard rows and sort by points descending
    const rows: Leaderboard[] = users
      .filter(u => (u.role || 'USER').toUpperCase() !== 'ADMIN')
      .map(u => ({ userId: u.id || '', username: u.name, points: typeof u.points === 'number' ? u.points : 0 }))
      .sort((a, b) => b.points - a.points || a.username.localeCompare(b.username));

    return rows;
  } catch (err) {
    console.error('getLeaderboard error', err);
    // fallback: empty list
    return [];
  }
};
