import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers, setCurrentUser } from "../../services/userService";
import { User } from "../../models/User";
import CryptoJS from 'crypto-js';

// Material-UI Imports
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Alert, 
  CircularProgress 
} from '@mui/material';

const hardcodedAdminPassword = "7e4c97f0668951f5334520b5cb38bd73";

const namePattern = /^[a-zA-Z][a-zA-Z _-]{1,29}$/;

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(process.env.ADMIN_PASS?.toString() || "");
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

    if (isAdmin && getMd5Hash(password) !== hardcodedAdminPassword) {
      setError("Admin password is incorrect.");
      return;
    }

    setLoading(true);
    setCurrentUser(matchedUser);
    setLoading(false);
    navigate("/dashboard");
  };

  function getMd5Hash(input: string): string {
    return CryptoJS.MD5(input).toString();
  }

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          marginTop: 8, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          boxShadow: 3,
          padding: 4,
          borderRadius: 2,
          backgroundColor: 'background.paper'
        }}
      >
        <Typography component="h1" variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          FIFA Prediction League
        </Typography>

        <Box sx={{ mt: 2, width: '100%' }}>
          {/* Standard text input with no suggestions */}
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            placeholder="Enter username"
            autoComplete="off"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
              if (password) setPassword("");
            }}
            variant="outlined"
          />

          {isAdmin && (
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Admin Password"
              type="password"
              id="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
            />
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Button
            type="button"
            fullWidth
            variant="contained"
            color="primary"
            onClick={login}
            disabled={
              loading || !usernameIsValid || !matchedUser || (isAdmin && !password)
            }
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
