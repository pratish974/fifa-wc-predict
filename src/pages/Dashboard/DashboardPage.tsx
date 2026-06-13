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
  const [visitorLocation, setVisitorLocation] = useState<ApproxLocation | null>(
    null,
  );
  const [visitorLocationError, setVisitorLocationError] = useState("");
  const { user } = useCurrentUser();

  useEffect(() => {
    loadMatches();
    loadUpcomingMatches();
    loadLeaderboard();
    loadUsers();
    loadVisitorLocation();
  }, []);

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

  const loadVisitorLocation = async () => {
    try {
      const response = await fetch("https://ipapi.co/json/", {
        headers: {
          "Accept": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Location lookup failed with ${response.status}`);
      }

      const data = (await response.json()) as ApproxLocation;
      setVisitorLocation(data);
      setVisitorLocationError("");
      console.log("Approx visitor location from IP lookup:", data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to look up IP-based location";
      setVisitorLocationError(message);
      console.error("Approx visitor location lookup failed:", error);
    }
  };

  const formatApproxLocation = (location: ApproxLocation | null) => {
    if (!location) return "";
    const place = [location.city, location.region || location.country_name || location.country]
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

  const getMatchDateValue = (match: Match) => match.kickoff?.ist || match.kickoff || match.date;

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

    if (diffMs <= 0) {
      return {
        disabled: true,
        locked: true,
        tooltip: "Match has already started",
      };
    }

    if (diffMs <= oneHourMs) {
      return {
        disabled: false,
        locked: true,
        tooltip: "Locked: Less than 1 hour to kickoff",
      };
    }

    return {
      disabled: false,
      locked: false,
      tooltip: "",
    };
  };

  const votedNames = (match: Match) =>
    (match.predictions || [])
      .filter((p) => p.prediction)
      .map((p) => {
        const u = allUsers.find((u) => u.id === p.userId);
        return u ? u.name : p.userId;
      })
      .join(", ") || "None";

  const notVotedNames = (match: Match) =>
    (allUsers || [])
      .filter(
        (u) =>
          !match.predictions?.find((p) => p.userId === u.id && p.prediction)
      )
      .map((u) => u.name)
      .join(", ") || "None";

  const votedRightNames = (match: Match) =>
    (match.votedRight || [])
      .map((id: string) => {
        const u = allUsers.find((u) => u.id === id);
        return u ? u.name : id;
      })
      .join(", ") || "None";

  const votedWrongNames = (match: Match) =>
    (match.votedWrong || [])
      .map((id: string) => {
        const u = allUsers.find((u) => u.id === id);
        return u ? u.name : id;
      })
      .join(", ") || "None";

  const notPlayedNames = (match: Match) =>
    (allUsers || [])
      .filter(
        (u) =>
          !match.predictions?.find((p) => p.userId === u.id && p.prediction)
      )
      .map((u) => u.name)
      .join(", ") || "None";

  const isTieMatch = (match: Match) => match.winner === "TIE";

  const renderTeamLabel = (team: string | undefined) => {
    if (!team) return "Unknown";
    const icon = getNationIcon(team);
    return icon ? `${icon} ${team}` : team;
  };

  const handlePredictionChange = (matchId: string, value: string) => {
    setSelectedPredictions((prev) => ({
      ...prev,
      [matchId]: value,
    }));
  };

  const handleSubmitPrediction = async (match: Match) => {
    if (!user) return;
    const prediction = selectedPredictions[match.matchId];
    if (!prediction) {
      alert("Please select a prediction");
      return;
    }

    try {
      await submitPrediction(
        match.matchId,
        user.id,
        prediction,
        user.name || user.id,
      );
      setSelectedPredictions((prev) => ({
        ...prev,
        [match.matchId]: "",
      }));
      loadMatches();
      loadUpcomingMatches();
      loadLeaderboard();
    } catch (error) {
      console.error("Error submitting prediction:", error);
      alert("Failed to submit prediction");
    }
  };

  const handleFinalResult = async (match: Match) => {
    if (!user) return;
    const result = selectedFinals[match.matchId];
    if (!result) {
      alert("Please select a result");
      return;
    }

    try {
      await finalizeMatch(match.matchId, result);
      setSelectedFinals((prev) => ({
        ...prev,
        [match.matchId]: "",
      }));
      loadMatches();
      loadUpcomingMatches();
      loadLeaderboard();
    } catch (error) {
      console.error("Error finalizing match:", error);
      alert("Failed to finalize match");
    }
  };

  const handleFinalResultChange = (matchId: string, value: string) => {
    setSelectedFinals((prev) => ({
      ...prev,
      [matchId]: value,
    }));
  };

  const renderUserPredictionControls = (match: Match) => {
    const state = getPredictionState(match);
    return (
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <select
          value={selectedPredictions[match.matchId] || ""}
          onChange={(e) =>
            handlePredictionChange(match.matchId, e.target.value)
          }
          disabled={state.disabled}
          title={state.tooltip}
          style={{
            padding: "6px",
            borderRadius: "4px",
            border: "1px solid var(--border-color)",
            cursor: state.disabled ? "not-allowed" : "pointer",
            opacity: state.disabled ? 0.5 : 1,
          }}
        >
          <option value="">-- Select prediction --</option>
          <option
            value={match.homeTeam || match.team1}
            disabled={state.locked}
          >
            {match.homeTeam || match.team1}
          </option>
          <option value="TIE" disabled={state.locked}>
            Draw
          </option>
          <option
            value={match.awayTeam || match.team2}
            disabled={state.locked}
          >
            {match.awayTeam || match.team2}
          </option>
        </select>
        <button
          onClick={() => handleSubmitPrediction(match)}
          disabled={state.disabled || !selectedPredictions[match.matchId]}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            background: state.disabled ? "#ccc" : "#0066cc",
            color: "white",
            border: "none",
            cursor: state.disabled ? "not-allowed" : "pointer",
          }}
        >
          Submit
        </button>
      </div>
    );
  };

  const renderAdminResultControls = (match: Match, label: string) => {
    return (
      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
        <select
          value={selectedFinals[match.matchId] || ""}
          onChange={(e) =>
            handleFinalResultChange(match.matchId, e.target.value)
          }
          style={{
            padding: "6px",
            borderRadius: "4px",
            border: "1px solid var(--border-color)",
          }}
        >
          <option value="">-- Select result --</option>
          <option value={match.homeTeam || match.team1}>
            {match.homeTeam || match.team1}
          </option>
          <option value="TIE">Draw</option>
          <option value={match.awayTeam || match.team2}>
            {match.awayTeam || match.team2}
          </option>
        </select>
        <button
          onClick={() => handleFinalResult(match)}
          disabled={!selectedFinals[match.matchId]}
          style={{
            padding: "6px 12px",
            borderRadius: "4px",
            background: selectedFinals[match.matchId] ? "#0066cc" : "#ccc",
            color: "white",
            border: "none",
            cursor: selectedFinals[match.matchId] ? "pointer" : "not-allowed",
          }}
        >
          {label}
        </button>
      </div>
    );
  };

  const displayedToday = matches.filter(isMatchInTodayTab);
  const displayedUpcoming = upcomingFromService.length
    ? upcomingFromService
    : matches.filter(isMatchInUpcomingTab);
  const pastMatches = matches.filter(isMatchInPastTab);

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>{todayLabel}</h1>
      <p style={{ color: "#6b7280", marginBottom: "20px" }}>
        {visitorLocation
          ? `${formatApproxLocation(visitorLocation)}`
          : visitorLocationError
            ? `Location lookup failed: ${visitorLocationError}`
            : "Looking up location..."}
      </p>

      <details
        style={{
          marginBottom: "24px",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "16px",
          background: "var(--card-background)",
        }}
        open
      >
        <summary
          style={{ fontSize: "1.1rem", fontWeight: 700, cursor: "pointer" }}
        >
          Today's Matches
        </summary>
        <div style={{ marginTop: "16px", display: "grid", gap: "16px" }}>
          {displayedToday.length === 0 ? (
            <p>No matches scheduled for today.</p>
          ) : (
            displayedToday.map((match) => (
              <div
                key={
                  match.matchId || `${match.team1}_${match.team2}_${match.date}`
                }
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: isTieMatch(match) ? "#f8fafc" : "white",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  opacity: isTieMatch(match) ? 0.92 : 1,
                }}
              >
                <h3 style={{ margin: "0 0 8px" }}>
                  {renderTeamLabel(match.team1 || match.homeTeam)} vs{" "}
                  {renderTeamLabel(match.team2 || match.awayTeam)}
                </h3>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Kickoff:</strong> {formatMatchDate(match.kickoff?.ist || match.date)}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Location:</strong> {match.location || "TBD"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Status:</strong> {match.status || "TBD"}
                </p>
                {/* Prediction UI for today */}
                {user ? (
                  <div style={{ marginTop: 12 }}>
                    {user.role === "USER"
                      ? renderUserPredictionControls(match)
                      : renderAdminResultControls(match, "Finalize")}
                  </div>
                ) : null}

                <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
                  {match.status !== "COMPLETED" ? (
                    <>
                      <div
                        style={{ color: "green" }}
                      >{`Voted: ${votedNames(match)}`}</div>
                      <div
                        style={{ color: "orange" }}
                      >{`Not Voted: ${notVotedNames(match)}`}</div>
                    </>
                  ) : isTieMatch(match) ? (
                    <>
                      <div style={{ color: "#6b7280" }}>
                        {`Tied Game: ${votedWrongNames(match)}`}
                      </div>
                      <div style={{ color: "#6b7280" }}>
                        {`Not Played: ${notPlayedNames(match)}`}
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        style={{ color: "green" }}
                      >{`Voted Right: ${votedRightNames(match)}`}</div>
                      <div
                        style={{ color: "orange" }}
                      >{`Voted Wrong: ${votedWrongNames(match)}`}</div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </details>

      <details
        style={{
          marginBottom: "24px",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "16px",
          background: "var(--card-background)",
        }}
      >
        <summary
          style={{ fontSize: "1.1rem", fontWeight: 700, cursor: "pointer" }}
        >
          Upcoming Matches
        </summary>
        <div style={{ marginTop: "16px", display: "grid", gap: "16px" }}>
          {displayedUpcoming.length === 0 ? (
            <p>No upcoming matches scheduled.</p>
          ) : (
            displayedUpcoming.map((match) => (
              <div
                key={
                  match.matchId || `${match.team1}_${match.team2}_${match.date}`
                }
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: isTieMatch(match) ? "#f8fafc" : "white",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  opacity: isTieMatch(match) ? 0.92 : 1,
                }}
              >
                <h3 style={{ margin: "0 0 8px" }}>
                  {renderTeamLabel(match.team1 || match.homeTeam)} vs{" "}
                  {renderTeamLabel(match.team2 || match.awayTeam)}
                </h3>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Kickoff:</strong> {formatMatchDate(match.kickoff?.ist || match.date)}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Location:</strong> {match.location || "TBD"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Status:</strong> {match.status || "TBD"}
                </p>
                {/* Prediction UI for upcoming */}
                {user ? (
                  <div style={{ marginTop: 12 }}>
                    {user.role === "USER"
                      ? renderUserPredictionControls(match)
                      : renderAdminResultControls(
                          match,
                          match.status === "COMPLETED"
                            ? "Update Result"
                            : "Finalize",
                        )}
                  </div>
                ) : null}

                <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
                  {match.status !== "COMPLETED" ? (
                    <>
                      <div
                        style={{ color: "green" }}
                      >{`Voted: ${votedNames(match)}`}</div>
                      <div
                        style={{ color: "orange" }}
                      >{`Not Voted: ${notVotedNames(match)}`}</div>
                    </>
                  ) : isTieMatch(match) ? (
                    <>
                      <div style={{ color: "#6b7280" }}>
                        {`Tied Game: ${votedWrongNames(match)}`}
                      </div>
                      <div style={{ color: "#6b7280" }}>
                        {`Not Played: ${notPlayedNames(match)}`}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ color: "green" }}>
                        Voted Right:{" "}
                        {(match.votedRight || [])
                          .map((id: string) => {
                            const u = allUsers.find((uu) => uu.id === id);
                            return u ? u.name : id;
                          })
                          .join(", ") || "None"}
                      </div>
                      <div style={{ color: "orange" }}>
                        Voted Wrong:{" "}
                        {(match.votedWrong || [])
                          .map((id: string) => {
                            const u = allUsers.find((uu) => uu.id === id);
                            return u ? u.name : id;
                          })
                          .join(", ") || "None"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </details>

      <details
        style={{
          marginBottom: "24px",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "16px",
          background: "var(--card-background)",
        }}
      >
        <summary
          style={{ fontSize: "1.1rem", fontWeight: 700, cursor: "pointer" }}
        >
          Past Matches
        </summary>
        <div style={{ marginTop: "16px", display: "grid", gap: "16px" }}>
          {pastMatches.length === 0 ? (
            <p>No past matches are available yet.</p>
          ) : (
            pastMatches.map((match) => (
              <div
                key={
                  match.matchId || `${match.team1}_${match.team2}_${match.date}`
                }
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: isTieMatch(match) ? "#f8fafc" : "white",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  opacity: isTieMatch(match) ? 0.92 : 1,
                }}
              >
                <h3 style={{ margin: "0 0 8px" }}>
                  {renderTeamLabel(match.team1 || match.homeTeam)} vs{" "}
                  {renderTeamLabel(match.team2 || match.awayTeam)}
                </h3>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Kickoff:</strong> {formatMatchDate(match.kickoff?.ist || match.date)}
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Location:</strong> {match.location || "Unknown"}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Winner:</strong>{" "}
                  <span
                    style={{
                      color: isTieMatch(match) ? "#6b7280" : "green",
                      fontWeight: 700,
                    }}
                  >
                    {isTieMatch(match) ? "Tied Game" : (match.winner || "TBD")}
                  </span>
                </p>
                {renderAdminResultControls(match, "Update Result")}
                <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
                  {isTieMatch(match) ? (
                    <div style={{ color: "#6b7280" }}>
                      {`Tied Game: ${votedWrongNames(match)}`}
                    </div>
                  ) : (
                    <>
                      <div
                        style={{ color: "green" }}
                      >{`Winner(s): ${votedRightNames(match)}`}</div>
                      <div
                        style={{ color: "orange" }}
                      >{`Loser(s): ${votedWrongNames(match)}`}</div>
                    </>
                  )}
                  <div
                    style={{ color: "#6b7280" }}
                  >{`Not Played: ${notPlayedNames(match)}`}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </details>

      <section>
        <h2>Leaderboard</h2>
        <LeaderboardTable rows={leaderboard} />
      </section>

      <footer
        style={{
          marginTop: "24px",
          color: "#6b7280",
          fontSize: "12px",
        }}
      >
        {visitorLocation
          ? `Location fetched: ${formatApproxLocation(visitorLocation) || "Approximate IP lookup complete"}`
          : `Location fetch error: ${visitorLocationError || "Still looking up location"}`}
      </footer>
    </div>
  );
}