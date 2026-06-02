import { useEffect, useState } from 'react';
import { Match } from '../models/Match';
import { getMatches } from '../services/matchService';

const useMatches = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMatches().then((data) => {
      setMatches(data);
      setLoading(false);
    });
  }, []);

  return { matches, loading };
};

export default useMatches;
