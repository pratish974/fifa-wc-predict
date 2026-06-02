import { useState } from 'react';
import { fetchUserById, setCurrentUser } from '../../services/userService';

const users = ['amit', 'ram', 'rohit', 'admin'];

export default function LoginPage() {
  const [user, setUser] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!user) return;
    setLoading(true);

    const fetched = await fetchUserById(user);

    if (fetched) {
      setCurrentUser(fetched);
    } else {
      // fallback: store minimal user object
      setCurrentUser({ id: user, name: user, role: 'USER', points: 0 });
    }

    setLoading(false);
    window.location.href = '/dashboard';
  };

  return (
    <div>
      <h1>FIFA Prediction League</h1>

      <select value={user} onChange={(e) => setUser(e.target.value)}>
        <option value="">Select User</option>

        {users.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>

      <button onClick={login} disabled={loading || !user}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </div>
  );
}