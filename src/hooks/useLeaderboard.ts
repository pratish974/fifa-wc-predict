import { useEffect, useState } from 'react';
import { Leaderboard } from '../models/Leaderboard';
import { getLeaderboard } from '../services/leaderboardService';

const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((data) => {
      setLeaderboard(data);
      setLoading(false);
    });
  }, []);

  return { leaderboard, loading };
};

export default useLeaderboard;
