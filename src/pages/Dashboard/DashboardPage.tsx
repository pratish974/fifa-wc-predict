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
        cache: "no-store",
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

  const renderTeamLabel = (team?: string) => {
    const name = team || "TBD";
    const icon = getNationIcon(name);

    return (
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
      >
        {icon ? (
          <img
            src={icon}
            alt={`${name} flag`}
            style={{
              width: 24,
              height: 16,
              objectFit: "cover",
              borderRadius: 2,
            }}
          />
        ) : null}
        <span>{name}</span>
      </span>
    );
  };

  const renderAdminResultControls = (match: Match, actionLabel: string) => {
    if (user?.role !== "ADMIN") return null;
    const selectedResult = selectedFinals[match.id || ""] || match.winner || "";

    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <select
          value={selectedResult}
          onChange={(e) =>
            setSelectedFinals((prev) => ({
              ...prev,
              [match.id || ""]: e.target.value,
            }))
          }
        >
          <option value="">Select result</option>
          <option value={match.team1 || match.homeTeam}>
            {match.team1 || match.homeTeam}
          </option>
          <option value={match.team2 || match.awayTeam}>
            {match.team2 || match.awayTeam}
          </option>
          <option value={"TIED"}>TIED</option>
        </select>
        <button
          onClick={async () => {
            const val = selectedFinals[match.id || ""] || match.winner || "";
            if (!val) return;
            await handleFinalizeMatch(match, val);
          }}
          disabled={!selectedResult}
        >
          {actionLabel}
        </button>
      </div>
    );
  };

  const renderUserPredictionControls = (match: Match) => {
    if (user?.role !== "USER") return null;

    const state = getPredictionState(match);

    return (
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <select
          value={selectedPredictions[match.id || ""] || ""}
          onChange={(e) =>
            setSelectedPredictions((prev) => ({
              ...prev,
              [match.id || ""]: e.target.value,
            }))
          }
          disabled={state.disabled}
          title={state.tooltip}
        >
          <option value="">Select winner</option>
          <option value={match.team1 || match.homeTeam}>
            {match.team1 || match.homeTeam}
          </option>
          <option value={match.team2 || match.awayTeam}>
            {match.team2 || match.awayTeam}
          </option>
        </select>
        <button
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
          title={state.tooltip}
        >
          {state.locked ? "🔒 Submit" : "Submit"}
        </button>
      </div>
    );
  };

  const todayMatches = matches.filter(isMatchInTodayTab);

  const pastMatches = matches.filter(isMatchInPastTab);

  const upcomingMatches = matches
    .filter((match) => {
      const date = parseMatchDate(getMatchDateValue(match));
      if (!date) return false;
      const diffMs = date.getTime() - new Date().getTime();
      return diffMs > 0 && diffMs <= oneWeekMs;
    })
    .sort((a, b) => {
      const da = parseMatchDate(getMatchDateValue(a));
      const db = parseMatchDate(getMatchDateValue(b));
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

  const displayedUpcoming = (
    upcomingFromService.length > 0 ? upcomingFromService : upcomingMatches
  ).filter((match) => {
    const date = parseMatchDate(getMatchDateValue(match));
    if (!date) return false;
    const diffMs = date.getTime() - new Date().getTime();
    return diffMs > 0 && diffMs <= oneWeekMs && !isMatchToday(match);
  });

  const handleSubmitPrediction = async (match: Match, selected: string) => {
    if (!match.id || !user) return;
    const ok = await submitPrediction(match.id, user.id, selected);
    if (ok) {
      // Optimistically update local state
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
      // reload matches/users/leaderboard
      await loadMatches();
      await loadUsers();
      await loadLeaderboard();
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1>Dashboard</h1>

      {/* Current user info */}
      {user ? (
        <div style={{ marginBottom: "12px" }}>
          <strong>Signed in as:</strong> {user.name} ({user.role}) —{" "}
          {user.points} pts
        </div>
      ) : null}

      <details
        open
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
          Today's Matches - {todayLabel}
        </summary>
        <div style={{ marginTop: "16px" }}>
          {todayMatches.length === 0 ? (
            <p>No matches scheduled for today.</p>
          ) : (
            todayMatches.map((match) => (
              <div
                key={
                  match.matchId || `${match.team1}_${match.team2}_${match.date}`
                }
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "14px",
                  background: "white",
                }}
              >
                <h3 style={{ margin: "0 0 8px" }}>
                  {renderTeamLabel(match.team1 || match.homeTeam)} vs{" "}
                  {renderTeamLabel(match.team2 || match.awayTeam)}
                </h3>
                <p style={{ margin: "0 0 6px" }}>
                  <strong>Kickoff:</strong> {formatMatchDate(match.kickoff?.ist || match.date)}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Status:</strong> {match.status}
                </p>
                {/* Prediction UI */}
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

                {/* Footer: voted / not voted or votedRight / votedWrong */}
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
                  background: "white",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
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
                  background: "white",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
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
                  <span style={{ color: "green", fontWeight: 700 }}>
                    {match.winner || "TBD"}
                  </span>
                </p>
                {renderAdminResultControls(match, "Update Result")}
                <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
                  <div
                    style={{ color: "green" }}
                  >{`Winner(s): ${votedRightNames(match)}`}</div>
                  <div
                    style={{ color: "orange" }}
                  >{`Loser(s): ${votedWrongNames(match)}`}</div>
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
