import { useEffect, useMemo, useState, useCallback } from "react";
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

type ApproxLocation = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
  postal?: string;
};

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
    location: "New York New Jersey Stadium",
    status: "COMPLETED",
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

  const tryLocationApis = useCallback(async (): Promise<ApproxLocation | null> => {
    try {
      const response = await fetch("https://ip-api.com/json/", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      });

      if (response.ok) {
        const data = await response.json();
        return {
          ip: data.query,
          city: data.city,
          region: data.regionName,
          country: data.countryCode,
          country_name: data.country,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          org: data.isp,
          postal: data.zip,
        };
      }
    } catch (err) {
      console.warn("ip-api.com failed:", err);
    }

    try {
      const response = await fetch(
        "https://geo.ipify.org/api/v2/country,city?apiKey=at_" +
          generateDemoKey(),
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          mode: "cors",
        },
      );

      if (response.ok) {
        const data = await response.json();
        return {
          ip: data.ip,
          city: data.location?.city,
          region: data.location?.region,
          country: data.location?.country,
          country_name: data.location?.country,
          latitude: data.location?.lat,
          longitude: data.location?.lng,
          timezone: data.location?.timezone,
          org: data.isp?.org,
          postal: data.postal?.code,
        };
      }
    } catch (err) {
      console.warn("ipify.org failed:", err);
    }

    try {
      const response = await fetch("https://ipapi.co/json/", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      });

      if (response.ok) {
        const data = await response.json();
        return {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country_code,
          country_name: data.country_name,
          latitude: data.latitude,
          longitude: data.longitude,
          timezone: data.timezone,
          org: data.org,
          postal: data.postal,
        };
      }
    } catch (err) {
      console.warn("ipapi.co failed:", err);
    }

    try {
      const response = await fetch("https://api.ipify.org?format=json", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      });

      if (response.ok) {
        const data = await response.json();
        return {
          ip: data.ip,
          city: "Unknown",
          region: "Unknown",
          country: "Unknown",
          country_name: "Unknown",
        };
      }
    } catch (err) {
      console.warn("ipify.org IP-only failed:", err);
    }

    return null;
  }, []);

  const generateDemoKey = () => {
    return "KL7fMOx3L0Zu3F1JV5Dy";
  };

  useEffect(() => {
    loadMatches();
    loadUpcomingMatches();
    loadLeaderboard();
    loadUsers();
  }, []);

  const formatApproxLocation = (location: ApproxLocation | null) => {
    if (!location) return "";
    const place = [
      location.city,
      location.region || location.country_name || location.country,
    ]
      .filter(Boolean)
      .join(", ");
    const ipPart = location.ip ? `IP ${location.ip}` : "";
    return [place, ipPart].filter(Boolean).join(" | ");
  };

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

  const notPlayedNames = (match: Match) => {
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

  const isTieResult = (value: unknown) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    return normalized === "tied" || normalized === "tie" || normalized === "draw";
  };

  const isTieMatch = (match: Match) => {
    return isTieResult(match.winner);
  };

  const getDetailedVotingInfo = (match: Match) => {
    const predictions = match.predictions || [];
    const votingMap = new Map<string, string>();

    predictions.forEach((p: any) => {
      const userId = p.userId || p.user;
      const prediction = p.prediction;

      if (userId && prediction) {
        const user = allUsers.find((u) => u.id === userId);
        if (user && user.role !== "ADMIN") {
          votingMap.set(user.name || user.id, prediction);
        }
      }
    });

    return votingMap;
  };

  const renderTeamLabel = (team?: string) => {
    const name = team || "TBD";
    const icon = getNationIcon(name);

    return (
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
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
        <Typography component="span" variant="subtitle1" sx={{ fontWeight: 500 }}>
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
            <MenuItem value=""><em>None</em></MenuItem>
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

    const controlMarkup = (
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 1 }}>
        <FormControl size="small" sx={{ minWidth: 150 }} disabled={state.disabled}>
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
            <MenuItem value=""><em>None</em></MenuItem>
            <MenuItem value={match.team1 || match.homeTeam}>
              {match.team1 || match.homeTeam}
            </MenuItem>
            <MenuItem value={match.team2 || match.awayTeam}>
              {match.team2 || match.awayTeam}
            </MenuItem>
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
          {state.locked ? "Submit" : "Submit"}
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

  const pastMatches = matches.filter(isMatchInPastTab);

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
      <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: "bold" }}>
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
      <Accordion defaultExpanded sx={{ mb: 3, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Today's Matches - {todayLabel}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {todayMatches.length === 0 ? (
            <Typography variant="body1" color="text.secondary">No matches scheduled for today.</Typography>
          ) : (
            <Grid container spacing={2}>
              {todayMatches.map((match) => (
                <Grid size={{ xs: 12 }} key={match.matchId || `${match.team1}_${match.team2}_${match.date}`}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      backgroundColor: isTieMatch(match) ? "action.hover" : "background.paper",
                      opacity: isTieMatch(match) ? 0.92 : 1
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
                        {renderTeamLabel(match.team1 || match.homeTeam)}
                        <Typography color="text.secondary">vs</Typography>
                        {renderTeamLabel(match.team2 || match.awayTeam)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Kickoff:</strong> {formatMatchDate(match.kickoff?.ist || match.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Stage:</strong> {match.stage || "TBD"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Status:</strong> {match.status}
                      </Typography>

                      {user && renderUserPredictionControls(match)}
                      {user && renderAdminResultControls(match, match.status === "COMPLETED" ? "Update Result" : "Finalize")}

                      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {match.status !== "COMPLETED" ? (
                          <>
                            <Typography variant="caption" sx={{ color: "success.main" }}>
                              <strong>Voted:</strong> {votedNames(match)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "warning.main" }}>
                              <strong>Not Voted:</strong> {notVotedNames(match)}
                            </Typography>
                          </>
                        ) : isTieMatch(match) ? (
                          <>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Tied Game:</strong> {votedWrongNames(match)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Not Played:</strong> {notPlayedNames(match)}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="caption" sx={{ color: "success.main" }}>
                              <strong>Voted Right:</strong> {votedRightNames(match)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "warning.main" }}>
                              <strong>Voted Wrong:</strong> {votedWrongNames(match)}
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
      <Accordion sx={{ mb: 3, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Upcoming Matches
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {displayedUpcoming.length === 0 ? (
            <Typography variant="body1" color="text.secondary">No upcoming matches scheduled.</Typography>
          ) : (
            <Grid container spacing={2}>
              {displayedUpcoming.map((match) => (
                <Grid size={{ xs: 12, md: 6 }} key={match.matchId || `${match.team1}_${match.team2}_${match.date}`}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      backgroundColor: isTieMatch(match) ? "action.hover" : "background.paper",
                      opacity: isTieMatch(match) ? 0.92 : 1
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
                        {renderTeamLabel(match.team1 || match.homeTeam)}
                        <Typography color="text.secondary">vs</Typography>
                        {renderTeamLabel(match.team2 || match.awayTeam)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Kickoff:</strong> {formatMatchDate(match.kickoff?.ist || match.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Stage:</strong> {match.stage || "TBD"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Location:</strong> {match.location || "TBD"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <strong>Status:</strong> {match.status || "TBD"}
                      </Typography>

                      {user && renderUserPredictionControls(match)}
                      {user && renderAdminResultControls(match, match.status === "COMPLETED" ? "Update Result" : "Finalize")}

                      <Box sx={{ mt: 2 }}>
                        {match.status !== "COMPLETED" ? (
                          <Box>
                            <Typography variant="caption" sx={{ color: "success.main", fontWeight: "bold", mb: 0.5, display: "block" }}>
                              Voted:
                            </Typography>
                            {getDetailedVotingInfo(match).size > 0 ? (
                              <Box sx={{ pl: 1, borderLeft: "2px solid", borderColor: "success.light", mb: 1 }}>
                                {Array.from(getDetailedVotingInfo(match)).map(([name, prediction]) => (
                                  <Typography variant="caption" key={name} sx={{ display: "block" }}>
                                    {name}: <strong>{prediction}</strong>
                                  </Typography>
                                ))}
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.disabled" sx={{ pl: 1, mb: 1, display: "block" }}>
                                No votes yet
                              </Typography>
                            )}

                            <Typography variant="caption" sx={{ color: "warning.main", fontWeight: "bold", mb: 0.5, display: "block" }}>
                              Not Voted:
                            </Typography>
                            <Typography variant="caption" sx={{ pl: 1, color: notVotedNames(match) !== "None" ? "text.primary" : "text.disabled", display: "block" }}>
                              {notVotedNames(match) !== "None" ? notVotedNames(match) : "Everyone voted"}
                            </Typography>
                          </Box>
                        ) : isTieMatch(match) ? (
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Tied Game:</strong> {votedWrongNames(match)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              <strong>Not Played:</strong> {notPlayedNames(match)}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Typography variant="caption" sx={{ color: "success.main" }}>
                              <strong>Voted Right:</strong> {(match.votedRight || []).map(id => allUsers.find(uu => uu.id === id)?.name || id).join(", ") || "None"}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "warning.main" }}>
                              <strong>Voted Wrong:</strong> {(match.votedWrong || []).map(id => allUsers.find(uu => uu.id === id)?.name || id).join(", ") || "None"}
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
      <Accordion sx={{ mb: 4, borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Past Matches
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          {pastMatches.length === 0 ? (
            <Typography variant="body1" color="text.secondary">No past matches are available yet.</Typography>
          ) : (
            <Grid container spacing={2}>
              {pastMatches.map((match) => (
                <Grid size={{ xs: 12, md: 6 }} key={match.matchId || `${match.team1}_${match.team2}_${match.date}`}>
                  <Card 
                    variant="outlined"
                    sx={{ 
                      backgroundColor: isTieMatch(match) ? "action.hover" : "background.paper",
                      opacity: isTieMatch(match) ? 0.92 : 1
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
                        {renderTeamLabel(match.team1 || match.homeTeam)}
                        <Typography color="text.secondary">vs</Typography>
                        {renderTeamLabel(match.team2 || match.awayTeam)}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Kickoff:</strong> {formatMatchDate(match.kickoff?.ist || match.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Location:</strong> {match.location || "Unknown"}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Winner:</strong>{" "}
                        <Box component="span" sx={{ color: isTieMatch(match) ? "text.secondary" : "success.main", fontWeight: "bold" }}>
                          {isTieMatch(match) ? "Tied Game" : match.winner || "TBD"}
                        </Box>
                      </Typography>

                      {renderAdminResultControls(match, "Update Result")}

                      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {isTieMatch(match) ? (
                          <Typography variant="caption" color="text.secondary">
                            <strong>Tied Game:</strong> {votedWrongNames(match)}
                          </Typography>
                        ) : (
                          <>
                            <Typography variant="caption" sx={{ color: "success.main" }}>
                              <strong>Winner(s):</strong> {votedRightNames(match)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "warning.main" }}>
                              <strong>Voted Wrong:</strong> {votedWrongNames(match)}
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

      {/* LEADERBOARD SECTION */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Leaderboard
        </Typography>
        <LeaderboardTable rows={leaderboard} />
      </Box>

      {/* FOOTER */}
      <Typography variant="caption" align="center" color="text.secondary" sx={{ mt: 4, display: "block" }}>
        &copy; CR Mitra Mandal Football Prediction Game 2026. All rights reserved.
      </Typography>
    </Container>
  );
}