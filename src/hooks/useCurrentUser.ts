import { useEffect, useState } from 'react';
import { User } from '../models/User';
import { getCurrentUser } from '../services/userService';

const useCurrentUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `getCurrentUser` is synchronous and returns `User | null`.
    const syncUser = () => {
      const data = getCurrentUser();
      setUser(data);
      setLoading(false);
    };

    syncUser();

    window.addEventListener('currentUserUpdated', syncUser);
    return () => window.removeEventListener('currentUserUpdated', syncUser);
  }, []);

  return { user, loading };
};

export default useCurrentUser;
