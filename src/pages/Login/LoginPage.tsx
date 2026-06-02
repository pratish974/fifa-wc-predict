import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers, setCurrentUser } from "../../services/userService";
import { User } from "../../models/User";

const hardcodedAdminPassword = process.env.ADMIN_PASS;

const namePattern = /^[a-zA-Z][a-zA-Z _-]{1,29}$/;

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    };

    loadUsers();
  }, []);

  const matchedUser = useMemo(
    () =>
      users.find(
        (u) =>
          u.id.toLowerCase() === username.trim().toLowerCase() ||
          u.name.toLowerCase() === username.trim().toLowerCase(),
      ),
    [username, users],
  );

  const isAdmin = matchedUser?.role === "ADMIN";
  const trimmedUsername = username.trim();
  const usernameIsValid =
    trimmedUsername.length > 0 && namePattern.test(trimmedUsername);

  const login = async () => {
    setError("");

    if (!trimmedUsername) {
      setError("Enter a username.");
      return;
    }

    if (!usernameIsValid) {
      setError(
        "Invalid username. Use letters, spaces, hyphens, or underscores only.",
      );
      return;
    }

    if (!matchedUser) {
      setError("Wrong user.");
      return;
    }

    if (isAdmin && password !== hardcodedAdminPassword) {
      setError("Admin password is incorrect.");
      return;
    }

    setLoading(true);
    setCurrentUser(matchedUser);
    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div>
      <h1>FIFA Prediction League</h1>

      <label htmlFor="username" style={{ display: "block", marginBottom: 8 }}>
        Username
      </label>
      <input
        id="username"
        list="users-list"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          setError("");
          if (password) setPassword("");
        }}
        style={{ width: "100%", padding: "10px", marginBottom: 8 }}
        placeholder="Enter username"
      />
      <datalist id="users-list">
        {users.map((u) => (
          <option key={u.id} value={u.id} />
        ))}
      </datalist>

      {isAdmin ? (
        <>
          <label
            htmlFor="password"
            style={{ display: "block", marginBottom: 8, marginTop: 16 }}
          >
            Admin password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "10px", marginBottom: 8 }}
            placeholder="Enter admin password"
          />
        </>
      ) : null}

      {error ? (
        <div style={{ color: "red", marginBottom: 12 }}>{error}</div>
      ) : null}

      <button
        onClick={login}
        disabled={
          loading || !usernameIsValid || !matchedUser || (isAdmin && !password)
        }
        style={{ padding: "10px 18px" }}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
