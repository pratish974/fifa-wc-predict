import { useEffect, useMemo, useState } from "react";
import useCurrentUser from "../../hooks/useCurrentUser";
import {
  getMatches,
  getUpcomingMatches,
  submitPrediction,
  finalizeMatch,
} from "../../services/matchService";
import {
  getAllUsers,
  getCurrentUser,
  setCurrentUser,
} from "../../services/userService";
import { getLeaderboard } from "../../services/leaderboardService";
import LeaderboardTable from "../../components/LeaderboardTable/LeaderboardTable";
import { Leaderboard } from "../../models/Leaderboard";
import { Match } from "../../models/Match";
import { getNationIcon } from "../../constants/nationsIcons";
import { formatMatchDate, parseMatchDate } from "../../utils/dateUtils";

// Material-UI Imports
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";

const todayDate = new Date();
const yesterdayDate = new Date(todayDate);
yesterdayDate.setDate(todayDate.getDate() - 1);
const tomorrowDate = new Date(todayDate);
tomorrowDate.setDate(todayDate.getDate() + 1);
const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
const oneHourMs = 60 * 60 * 1000;
const fourHoursMs = 4 * 60 * 60 * 1000;

const demoMatches: Match[] = [
  {
    matchId: "demo-1",
    homeTeam: "Mexico",
    awayTeam: "South Africa",
    date: todayDate.toISOString(),
    location: "Mexico City Stadium",
    status: "OPEN",
    winner: null,
  },
  {
    matchId: "demo-2",
    homeTeam: "South Korea",
    awayTeam: "Czech Republic",
    date: tomorrowDate.toISOString(),
    location: "Estadio Guadalajara",
    status: "OPEN",
    winner: null,
  },
  {
    matchId: "demo-3",
    homeTeam: "Brazil",
    awayTeam: "Morocco",
    date: yesterdayDate.toISOString(),
    location: "COMPLETED",
    winner: "Brazil",
  },
  {
    matchId: "demo-4",
    homeTeam: "United States",
    awayTeam: "Paraguay",
    date: yesterdayDate.toISOString(),
    location: "Los Angeles Stadium",
    status: "COMPLETED",
    winner: "United States",
  },
];

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>(demoMatches);
  const [upcomingFromService, setUpcomingFromService] = useState<Match[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedPredictions, setSelectedPredictions] = useState<
    Record<string, string>
  >({});
  const [selectedFinals, setSelectedFinals] = useState<Record<string, string>>(
    {},
  );
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>([]);

  const { user } = useCurrentUser();

  const loadMatches = async () => {
    const data = await getMatches();
    setMatches(data as Match[]);
  };

  const loadUpcomingMatches = async () => {
    const data = await getUpcomingMatches();
    setUpcomingFromService(data as Match[]);
  };

  const loadLeaderboard = async () => {
    const data = await getLeaderboard();
    setLeaderboard(data);
  };

  const loadUsers = async () => {
    const data = await getAllUsers();
    setAllUsers(data as any[]);

    const current = getCurrentUser();
    if (current?.id) {
      const refreshed = (data as any[]).find((u) => u.id === current.id);
      if (refreshed) {
        setCurrentUser(refreshed);
      }
    }
  };

  useEffect(() => {
    loadMatches();
    loadUpcomingMatches();
    loadLeaderboard();
    loadUsers();
  }, []);

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  const todayStart = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value.getTime();
  }, []);

  const getMatchDateValue = (match: Match) =>
    match.kickoff?.ist || match.kickoff || match.date;

  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.getTime();
  };

  const isMatchToday = (match: Match) => {
    const date = parseMatchDate(getMatchDateValue(match));
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isMatchInTodayTab = (match: Match) => {
    const date = parseMatchDate(getMatchDateValue(match));
    if (!date || !isMatchToday(match)) return false;
    const now = new Date();
    return now.getTime() < date.getTime() + fourHoursMs;
  };

  const isMatchInPastTab = (match: Match) => {
    const date = parseMatchDate(getMatchDateValue(match));
    if (!date) return false;

    const now = new Date();
    if (normalizeDate(date) < todayStart) return true;
    return isMatchToday(match) && now.getTime() >= date.getTime() + fourHoursMs;
  };

  const isMatchInUpcomingTab = (match: Match) => {
    const date = parseMatchDate(getMatchDateValue(match));
    if (!date) return false;

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();

    return diffMs > 0 && diffMs <= oneWeekMs;
  };

  // Condition hook checking for enabling tied selection configurations 
  const isTiedOptionEnabled = (match: Match) => {
    if (match.stage !== "Group Stage") return false;
    const date = parseMatchDate(getMatchDateValue(match));
    if (!date) return false;
    
    // Restriction activation point setting target: June 26, 2026
    const restrictionDate = new Date("2026-06-26T00:00:00");
    return date.getTime() >= restrictionDate.getTime();
  };

  const getPredictionState = (match: Match) => {
    const date = parseMatchDate(getMatchDateValue(match));
    if (!date) {
      return {
        disabled: true,
        locked: true,
        tooltip: "Match date unavailable",
      };
    }

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const withinWeek = diffMs > 0 && diffMs <= oneWeekMs;
    const withinOneHour = diffMs > 0 && diffMs <= oneHourMs;
    const alreadyStarted = now.getTime() >= date.getTime();
    const startedButVisible =
      isMatchToday(match) &&
      now.getTime() >= date.getTime() &&
      now.getTime() < date.getTime() + fourHoursMs;

    if (startedButVisible) {
      return {
        disabled: true,
        locked: true,
        tooltip: "Match already started",
      };
    }

    if (!withinWeek) {
      return {
        disabled: true,
        locked: true,
        tooltip: "Predictions open only during the 7 days before kickoff",
      };
    }

    if (alreadyStarted) {
      return {
        disabled: true,
        locked: true,
        tooltip: "Match already started",
      };
    }

    if (withinOneHour) {
      return {
        disabled: true,
        locked: true,
        tooltip: "Predictions locked within 1 hour of kickoff",
      };
    }

    return {
      disabled: false,
      locked: false,
      tooltip: undefined,
    };
  };

  const votedNames = (match: Match) => {
    return (
      (match.predictions || [])
        .map((p: any) => {
          const u = allUsers.find((uu) => uu.id === (p.userId || p.user));
          return u && u.role !== "ADMIN" ? u.name : null;
        })
        .filter(Boolean)
        .join(", ") || "None"
    );
  };

  const notVotedNames = (match: Match) => {
    return (
      allUsers
        .filter(
          (u) =>
            u.role !== "ADMIN" &&
            !(match.predictions || []).some(
              (p: any) => (p.userId || p.user) === u.id,
            ),
        )
        .map((u) => u.name)
        .join(", ") || "None"
    );
  };

  const votedRightNames = (match: Match) => {
    return (
      (match.votedRight || [])
        .map((id: string) => {
          const u = allUsers.find((uu) => uu.id === id);
          return u && u.role !== "ADMIN" ? u.name : null;
        })
        .filter(Boolean)
        .join(", ") || "None"
    );
  };

  const votedWrongNames = (match: Match) => {
    return (
      (match.votedWrong || [])
        .map((id: string) => {
          const u = allUsers.find((uu) => uu.id === id);
          return u && u.role !== "ADMIN" ? u.name : null;
        })
        .filter(Boolean)
        .join(", ") || "None"
    );
  };

  const isTieResult = (value: unknown) => {
    const normalized = String(value ?? "")
      .trim()
      .toLowerCase();
    return (
      normalized === "tied" || normalized === "tie" || normalized === "draw"
    );
  };

  const isTieMatch = (match: Match) => {
    return isTieResult(match.winner);
  };

  const getLoggedInUserPrediction = (match: Match) => {
    if (!user || user.role === "ADMIN") return null;
    const found = (match.predictions || []).find(
      (p: any) => (p.userId || p.user) === user.id,
    );
    return found ? found.prediction : null;
  };

  const getOtherVotersHorizontalList = (match: Match) => {
    const predictions = match.predictions || [];
    return (
      predictions
        .map((p: any) => {
          const userId = p.userId || p.user;
          if (user && userId === user.id) return null;
          const u = allUsers.find((uu) => uu.id === userId);
          return u && u.role !== "ADMIN" ? u.name : null;
        })
        .filter(Boolean)
        .join(", ") || "None"
    );
  };

  const hasLoggedInUserVoted = (match: Match) => {
    if (!user || user.role !== "USER") return false;
    return (match.predictions || []).some(
      (p: any) => (p.userId || p.user) === user.id,
    );
  };

  const getTeamVoters = (match: Match, teamName: string) => {
    const normalizedTarget = String(teamName || "")
      .trim()
      .toLowerCase();

    return (
      (match.predictions || [])
        .map((p: any) => {
          const pickedTeam = String(p.prediction || "")
            .trim()
            .toLowerCase();
          if (pickedTeam !== normalizedTarget) return null;

          const pickedUserId = p.userId || p.user;
          const pickedUser = allUsers.find((u) => u.id === pickedUserId);
          return pickedUser && pickedUser.role !== "ADMIN"
            ? pickedUser.name
            : null;
        })
        .filter(Boolean)
        .join(", ") || "None"
    );
  };

  const getVoterTeamSelections = (match: Match) => {
    return (
      (match.predictions || [])
        .map((p: any) => {
          const pickedUserId = p.userId || p.user;
          const pickedUser = allUsers.find((u) => u.id === pickedUserId);
          if (!pickedUser || pickedUser.role === "ADMIN") return null;

          const pickedTeam = String(p.prediction || "").trim() || "No Selection";
          return `${pickedUser.name} - ${pickedTeam}`;
        })
        .filter(Boolean) as string[]
    );
  };

  const isTodayMatchLockedForReveal = (match: Match) => {
    if (!isMatchToday(match)) return false;

    const status = String(match.status || "")
      .trim()
      .toUpperCase();

    if (status === "LOCKED" || status === "IN_PROGRESS" || status === "COMPLETED") {
      return true;
    }

    return getPredictionState(match).locked;
  };

  const shouldRevealTodaySelections = (match: Match) => {
    if (!isTodayMatchLockedForReveal(match)) return false;
    return hasLoggedInUserVoted(match);
  };

  const renderTeamLabel = (team?: string) => {
    const name = team || "TBD";
    const icon = getNationIcon(name);

    return (
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        {icon ? (
          <Box
            component="img"
            src={icon}
            alt={`${name} flag`}
            sx={{
              width: 24,
              height: 16,
              objectFit: "cover",
              borderRadius: 0.5,
            }}
          />
        ) : null}
        <Typography
          component="span"
          variant="subtitle1"
          sx={{ fontWeight: 500 }}
        >
          {name}
        </Typography>
      </Box>
    );
  };

  const renderAdminResultControls = (match: Match, actionLabel: string) => {
    if (user?.role !== "ADMIN") return null;
    const selectedResult = selectedFinals[match.id || ""] || match.winner || "";

    return (
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Select Result</InputLabel>
          <Select
            label="Select Result"
            value={selectedResult}
            onChange={(e) =>
              setSelectedFinals((prev) => ({
                ...prev,
                [match.id || ""]: e.target.value,
              }))
            }
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value={match.team1 || match.homeTeam}>
              {match.team1 || match.homeTeam}
            </MenuItem>
            <MenuItem value={match.team2 || match.awayTeam}>
              {match.team2 || match.awayTeam}
            </MenuItem>
            <MenuItem value={"TIED"}>TIED</MenuItem>
          </Select>
        </FormControl>
        <Button
          size="medium"
          variant="contained"
          color="secondary"
          onClick={async () => {
            const val = selectedFinals[match.id || ""] || match.winner || "";
            if (!val) return;
            await handleFinalizeMatch(match, val);
          }}
          disabled={!selectedResult}
        >
          {actionLabel}
        </Button>
      </Box>
    );
  };

  const renderUserPredictionControls = (match: Match) => {
    if (user?.role !== "USER") return null;

    const state = getPredictionState(match);
    const enableTiedOption = isTiedOptionEnabled(match);

    const controlMarkup = (
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
        <FormControl
          size="small"
          sx={{ minWidth: 150 }}
          disabled={state.disabled}
        >
          <InputLabel>Select Winner</InputLabel>
          <Select
            label="Select Winner"
            value={selectedPredictions[match.id || ""] || ""}
            onChange={(e) =>
              setSelectedPredictions((prev) => ({
                ...prev,
                [match.id || ""]: e.target.value,
              }))
            }
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value={match.team1 || match.homeTeam}>
              {match.team1 || match.homeTeam}
            </MenuItem>
            <MenuItem value={match.team2 || match.awayTeam}>
              {match.team2 || match.awayTeam}
            </MenuItem>
            {enableTiedOption && (
              <MenuItem value="TIED">TIED</MenuItem>
            )}
          </Select>
        </FormControl>
        <Button
          size="medium"
          variant="contained"
          startIcon={state.locked ? <LockIcon /> : null}
          onClick={async () => {
            const val = selectedPredictions[match.id || ""];
            if (!val) return;
            await handleSubmitPrediction(match, val);
          }}
          disabled={
            !!(
              match.predictions &&
              match.predictions.find((p) => p.userId === user.id)
            ) || state.disabled
          }
        >
          Submit
        </Button>
      </Box>
    );

    return state.tooltip ? (
      <Tooltip title={state.tooltip} arrow placement="top">
        <span>{controlMarkup}</span>
      </Tooltip>
    ) : (
      controlMarkup
    );
  };

  const todayMatches = matches.filter(isMatchInTodayTab);

  // Requirement 1: Arrange past matches descending according to matchId tags string safely
  const pastMatches = matches
    .filter(isMatchInPastTab)
    .sort((a, b) => {
      const idA = String(a.matchId || a.id || '');
      const idB = String(b.matchId || b.id || '');
      return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
    });

  const upcomingMatches = matches
    .filter((match) => {
      return isMatchInUpcomingTab(match);
    })
    .sort((a, b) => {
      const da = parseMatchDate(getMatchDateValue(a));
      const db = parseMatchDate(getMatchDateValue(b));
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

  const displayedUpcoming = (
    upcomingFromService.length > 0 ? upcomingFromService : upcomingMatches
  ).filter((match) => isMatchInUpcomingTab(match));

  const handleSubmitPrediction = async (match: Match, selected: string) => {
    if (!match.id || !user) return;
    const ok = await submitPrediction(match.id, user.id, selected);
    if (ok) {
      const newPred = {
        matchId: match.id,
        userId: user.id,
        prediction: selected,
        submittedAt: new Date().toISOString(),
      };
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id
            ? { ...m, predictions: [...(m.predictions || []), newPred] }
            : m,
        ),
      );
    }
  };

  const handleFinalizeMatch = async (match: Match, selectedWinner: string) => {
    if (!match.id) return;
    const ok = await finalizeMatch(match.id, selectedWinner);
    if (ok) {
      setSelectedFinals((prev) => ({
        ...prev,
        [match.id || ""]: selectedWinner,
      }));
      await loadMatches();
      await loadUsers();
      await loadLeaderboard();
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        sx={{ fontWeight: "bold" }}
      >
        Dashboard
      </Typography>

      {user && (
        <Chip
          label={`Signed in as: ${user.name} (${user.role}) — ${user.points.toFixed(2)} pts`}
          color="primary"
          variant="outlined"
          sx={{ mb: 3, fontSize: "1rem", py: 2 }}
        />
      )}

      {/* TODAY'S MATCHES ACCORDION */}
      <Accordion
        defaultExpanded
        sx={{
          mb: 3,
          borderRadius: 2,
          "&:before": { display: "none" },
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Today's Matches - {todayLabel}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {todayMatches.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No matches scheduled for today.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {todayMatches.map((match) => (
                <Grid
                  size={{ xs: 12 }}
                  key={
                    match.matchId ||
                    `${match.team1}_${match.team2}_${match.date}`
                  }
                >
                  <Card
                    variant="outlined"
                    sx={{
                      backgroundColor: isTieMatch(match)
                        ? "action.hover"
                        : "background.paper",
                      opacity: isTieMatch(match) ? 0.92 : 1,
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                          mb: 1,
                        }}
                      >
                        {renderTeamLabel(match.team1 || match.homeTeam)}
                        <Typography color="text.secondary">vs</Typography>
                        {renderTeamLabel(match.team2 || match.awayTeam)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Kickoff:</strong>{" "}
                        {formatMatchDate(match.kickoff?.ist || match.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Stage:</strong> {match.stage || "TBD"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        <strong>Status:</strong> {match.status}
                      </Typography>

                      {user && renderUserPredictionControls(match)}
                      {user &&
                        renderAdminResultControls(
                          match,
                          match.status === "COMPLETED"
                            ? "Update Result"
                            : "Finalize",
                        )}

                      <Box
                        sx={{
                          mt: 2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        {match.status !== "COMPLETED" ? (
                          <>
                            {shouldRevealTodaySelections(match) ? (
                              <>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "primary.main" }}
                                >
                                  <strong>You Selected:</strong>{" "}
                                  <strong>{getLoggedInUserPrediction(match)}</strong>
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "success.main" }}
                                >
                                  <strong>{match.team1 || match.homeTeam}:</strong>{" "}
                                  {getTeamVoters(
                                    match,
                                    match.team1 || match.homeTeam || "",
                                  )}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "success.main" }}
                                >
                                  <strong>{match.team2 || match.awayTeam}:</strong>{" "}
                                  {getTeamVoters(
                                    match,
                                    match.team2 || match.awayTeam || "",
                                  )}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "info.main", mt: 0.5 }}
                                >
                                  <strong>Person + Team:</strong>
                                </Typography>
                                {getVoterTeamSelections(match).length > 0 ? (
                                  getVoterTeamSelections(match).map((entry) => (
                                    <Typography
                                      key={entry}
                                      variant="caption"
                                      sx={{ color: "info.main" }}
                                    >
                                      {entry}
                                    </Typography>
                                  ))
                                ) : (
                                  <Typography
                                    variant="caption"
                                    sx={{ color: "info.main" }}
                                  >
                                    None
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <>
                                {isMatchToday(match) &&
                                  hasLoggedInUserVoted(match) &&
                                  !isTodayMatchLockedForReveal(match) && (
                                    <Typography
                                      variant="caption"
                                      sx={{ color: "info.main" }}
                                    >
                                      You voted. Team-wise selections will be visible once this match is locked.
                                    </Typography>
                                  )}
                                <Typography
                                  variant="caption"
                                  sx={{ color: "success.main" }}
                                >
                                  <strong>Voted:</strong> {votedNames(match)}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: "warning.main" }}
                                >
                                  <strong>Not Voted:</strong> {notVotedNames(match)}
                                </Typography>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography
                              variant="caption"
                              sx={{ color: "success.main" }}
                            >
                              <strong>Voted Right:</strong>{" "}
                              {votedRightNames(match)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "warning.main" }}
                            >
                              <strong>Voted Wrong:</strong>{" "}
                              {votedWrongNames(match)}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* UPCOMING MATCHES ACCORDION */}
      <Accordion
        sx={{
          mb: 3,
          borderRadius: 2,
          "&:before": { display: "none" },
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Upcoming Matches
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {displayedUpcoming.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No upcoming matches scheduled.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {displayedUpcoming.map((match) => (
                <Grid
                  size={{ xs: 12, md: 6 }}
                  key={
                    match.matchId ||
                    `${match.team1}_${match.team2}_${match.date}`
                  }
                >
                  <Card
                    variant="outlined"
                    sx={{
                      backgroundColor: isTieMatch(match)
                        ? "action.hover"
                        : "background.paper",
                      opacity: isTieMatch(match) ? 0.92 : 1,
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                          mb: 1,
                        }}
                      >
                        {renderTeamLabel(match.team1 || match.homeTeam)}
                        <Typography color="text.secondary">vs</Typography>
                        {renderTeamLabel(match.team2 || match.awayTeam)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Kickoff:</strong>{" "}
                        {formatMatchDate(match.kickoff?.ist || match.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Stage:</strong> {match.stage || "TBD"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Location:</strong> {match.location || "TBD"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        <strong>Status:</strong> {match.status || "TBD"}
                      </Typography>

                      {user && renderUserPredictionControls(match)}
                      {user &&
                        renderAdminResultControls(
                          match,
                          match.status === "COMPLETED"
                            ? "Update Result"
                            : "Finalize",
                        )}

                      <Box sx={{ mt: 2 }}>
                        {match.status !== "COMPLETED" ? (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.5,
                            }}
                          >
                            {user &&
                              user.role !== "ADMIN" &&
                              getLoggedInUserPrediction(match) && (
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "primary.main",
                                    display: "block",
                                  }}
                                >
                                  <strong>You Selected:</strong>{" "}
                                  <strong>
                                    {getLoggedInUserPrediction(match)}
                                  </strong>
                                </Typography>
                              )}

                            <Typography
                              variant="caption"
                              sx={{ color: "success.main", display: "block" }}
                            >
                              <strong>Other Voters:</strong>{" "}
                              {getOtherVotersHorizontalList(match)}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{ color: "warning.main", display: "block" }}
                            >
                              <strong>Not Voted:</strong>{" "}
                              {notVotedNames(match) !== "None"
                                ? notVotedNames(match)
                                : "Everyone voted"}
                            </Typography>
                          </Box>
                        ) : (
                          <Box
                            sx={{ display: "flex", flexDirection: "column" }}
                          >
                            <Typography
                              variant="caption"
                              sx={{ color: "success.main" }}
                            >
                              <strong>Voted Right:</strong>{" "}
                              {votedRightNames(match)}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: "warning.main" }}
                            >
                              <strong>Voted Wrong:</strong>{" "}
                              {votedWrongNames(match)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* PAST MATCHES ACCORDION */}
      <Accordion
        sx={{
          mb: 4,
          borderRadius: 2,
          "&:before": { display: "none" },
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Past Matches
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {pastMatches.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No past matches are available yet.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {pastMatches.map((match) => (
                <Grid
                  size={{ xs: 12, md: 6 }}
                  key={
                    match.matchId ||
                    `${match.team1}_${match.team2}_${match.date}`
                  }
                >
                  <Card
                    variant="outlined"
                    sx={{
                      backgroundColor: isTieMatch(match)
                        ? "action.hover"
                        : "background.paper",
                      opacity: isTieMatch(match) ? 0.92 : 1,
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                          mb: 1,
                        }}
                      >
                        {renderTeamLabel(match.team1 || match.homeTeam)}
                        <Typography color="text.secondary">vs</Typography>
                        {renderTeamLabel(match.team2 || match.awayTeam)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Match ID:</strong> {match.matchId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Kickoff:</strong>{" "}
                        {formatMatchDate(match.kickoff?.ist || match.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Location:</strong> {match.location || "Unknown"}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Winner:</strong>{" "}
                        <Box
                          component="span"
                          sx={{
                            color: isTieMatch(match)
                              ? "text.secondary"
                              : "success.main",
                            fontWeight: "bold",
                          }}
                        >
                          {isTieMatch(match)
                            ? "Tied Game"
                            : match.winner || "TBD"}
                        </Box>
                      </Typography>

                      {renderAdminResultControls(match, "Update Result")}

                      <Box
                        sx={{
                          mt: 2,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "success.main" }}
                        >
                          <strong>Winner(s):</strong>{" "}
                          {votedRightNames(match)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "warning.main" }}
                        >
                          <strong>Voted Wrong:</strong>{" "}
                          {votedWrongNames(match)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* LEADERBOARD SECTION */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Leaderboard
        </Typography>
        <LeaderboardTable rows={leaderboard} />
      </Box>

      {/* FOOTER */}
      <Typography
        variant="caption"
        align="center"
        color="text.secondary"
        sx={{ mt: 4, display: "block" }}
      >
        &copy; CR Mitra Mandal Football Prediction Game 2026. All rights
        reserved.
      </Typography>
    </Container>
  );
}