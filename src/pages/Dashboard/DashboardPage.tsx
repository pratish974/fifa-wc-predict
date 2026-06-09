import { useEffect, useMemo, useState } from "react";
import useCurrentUser from "../../hooks/useCurrentUser";
import {
  getMatches,
  getUpcomingMatches,
  submitPrediction,
  finalizeMatch,
} from "../../services/matchService";
import { getAllUsers, getCurrentUser, setCurrentUser } from "../../services/userService";
import { getLeaderboard } from "../../services/leaderboardService";
import LeaderboardTable from "../../components/LeaderboardTable/LeaderboardTable";
import { Leaderboard } from "../../models/Leaderboard";
import { Match } from "../../models/Match";
import { getNationIcon } from "../../constants/nationsIcons";

const todayDate = new Date();
const yesterdayDate = new Date(todayDate);
yesterdayDate.setDate(todayDate.getDate() - 1);
const tomorrowDate = new Date(todayDate);
tomorrowDate.setDate(todayDate.getDate() + 1);
const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
const oneHourMs = 60 * 60 * 1000;

const formatMatchDateString = (value: string) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleString();
};

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

  useEffect(() => {
    loadMatches();
    loadUpcomingMatches();
    loadLeaderboard();
    loadUsers();
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

  const parseMatchDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === "object" && value !== null) {
      const v: any = value;
      // Firestore Timestamp instance
      if (typeof v.toDate === "function") {
        try {
          const date = v.toDate();
          return isNaN(date.getTime()) ? null : date;
        } catch {
          return null;
        }
      }

      // Plain object with seconds/nanoseconds (e.g. serialized timestamp)
      if (typeof v.seconds === "number") {
        const ms =
          v.seconds * 1000 +
          (typeof v.nanoseconds === "number"
            ? Math.floor(v.nanoseconds / 1e6)
            : 0);
        const date = new Date(ms);
        return isNaN(date.getTime()) ? null : date;
      }
    }

    return null;
  };

  const normalizeDate = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.getTime();
  };

  const isMatchToday = (match: Match) => {
    const date = parseMatchDate(match.date);
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // Lock predictions one hour before kickoff for today's matches
  const isLockedForPrediction = (match: Match) => {
    const date = parseMatchDate(match.date);
    if (!date) return true; // unknown date => lock by default
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    // locked when match starts within the next hour but hasn't started yet
    return diffMs <= oneHourMs && diffMs > 0;
  };

  const isWithinSubmissionWindow = (match: Match) => {
    const date = parseMatchDate(match.date);
    if (!date) return false;

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    return diffMs > oneHourMs && diffMs <= oneWeekMs;
  };

  const canUserPredictMatch = (match: Match) => {
    if (!user || user.role !== "USER") return false;
    if (match.status === "COMPLETED") return false;
    return isWithinSubmissionWindow(match) && !isLockedForPrediction(match);
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

  const renderAdminResultControls = (
    match: Match,
    actionLabel: string,
  ) => {
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

  const todayMatches = matches.filter(isMatchToday);

  const pastMatches = matches.filter((match) => {
    const date = parseMatchDate(match.date);
    return date ? normalizeDate(date) < todayStart : false;
  });

  const upcomingMatches = matches
    .filter((match) => {
      const date = parseMatchDate(match.date);
      if (!date) return false;
      const diffMs = date.getTime() - new Date().getTime();
      return diffMs > 0 && diffMs <= oneWeekMs;
    })
    .sort((a, b) => {
      const da = parseMatchDate(a.date);
      const db = parseMatchDate(b.date);
      if (!da || !db) return 0;
      return da.getTime() - db.getTime();
    });

  const displayedUpcoming = (
    upcomingFromService.length > 0 ? upcomingFromService : upcomingMatches
  ).filter((match) => {
    const date = parseMatchDate(match.date);
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
                  <strong>Date:</strong> {formatMatchDateString(match.date)}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Status:</strong> {match.status}
                </p>
                {/* Prediction UI */}
                {user ? (
                  <div style={{ marginTop: 12 }}>
                    {user.role === "USER" ? (
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
                          disabled={!canUserPredictMatch(match)}
                          title={
                            !isWithinSubmissionWindow(match)
                              ? "Predictions open only during the 7 days before kickoff"
                              : isLockedForPrediction(match)
                                ? "Predictions locked within 1 hour of kickoff"
                                : undefined
                          }
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
                            ) || !canUserPredictMatch(match)
                          }
                          title={
                            !isWithinSubmissionWindow(match)
                              ? "Predictions open only during the 7 days before kickoff"
                              : isLockedForPrediction(match)
                                ? "Predictions locked within 1 hour of kickoff"
                                : undefined
                          }
                        >
                          Submit
                        </button>
                      </div>
                    ) : (
                      renderAdminResultControls(
                        match,
                        match.status === "COMPLETED"
                          ? "Update Result"
                          : "Finalize",
                      )
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
                  <strong>Date:</strong> {formatMatchDateString(match.date)}
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
                    {user.role === "USER" ? (
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
                          disabled={!canUserPredictMatch(match)}
                          title={
                            !isWithinSubmissionWindow(match)
                              ? "Predictions open only during the 7 days before kickoff"
                              : isLockedForPrediction(match)
                                ? "Predictions locked within 1 hour of kickoff"
                                : undefined
                          }
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
                              match.predictions.find(
                                (p) => p.userId === user.id,
                              )
                            ) || !canUserPredictMatch(match)
                          }
                          title={
                            !isWithinSubmissionWindow(match)
                              ? "Predictions open only during the 7 days before kickoff"
                              : isLockedForPrediction(match)
                                ? "Predictions locked within 1 hour of kickoff"
                                : undefined
                          }
                        >
                          Submit
                        </button>
                      </div>
                    ) : (
                      renderAdminResultControls(
                        match,
                        match.status === "COMPLETED"
                          ? "Update Result"
                          : "Finalize",
                      )
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
                  <strong>Date:</strong> {formatMatchDateString(match.date)}
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
    </div>
  );
}
