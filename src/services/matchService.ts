import {
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
  where,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  increment
} from 'firebase/firestore';

import { db } from '../firebase/firebase';
import { Match } from '../models/Match';
import { getAllUsers } from './userService';

// Return the raw Firestore timestamp/value unchanged.
// We previously converted timestamps to ISO strings here, but that caused
// timezone/identity issues when rendering and filtering. Keep the original
// value so callers can decide how to parse/format it.
const convertFirestoreTimestamp = (value: any): any => {
  return value;
};

const normalizeAnswer = (value: unknown): string =>
  String(value ?? '').trim().toLowerCase();

const isTieResult = (value: unknown): boolean => {
  const normalized = normalizeAnswer(value);
  return normalized === 'tied' || normalized === 'tie' || normalized === 'draw';
};

const parseMatchDate = (value: unknown): Date | null => {
  if (!value) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object') {
    const v: any = value;

    if (typeof v.toDate === 'function') {
      try {
        const date = v.toDate();
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }

    if (typeof v.seconds === 'number') {
      const ms =
        v.seconds * 1000 +
        (typeof v.nanoseconds === 'number' ? Math.floor(v.nanoseconds / 1e6) : 0);
      const date = new Date(ms);
      return isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
};

const getMatchDateFromData = (data: any): Date | null => {
  return (
    parseMatchDate(data?.date) ||
    parseMatchDate(data?.kickoff?.ist?.date) ||
    parseMatchDate(data?.kickoff?.date) ||
    parseMatchDate(data?.matchDate) ||
    null
  );
};

const isSubmissionWindowOpen = (matchDate: Date | null): boolean => {
  if (!matchDate) return false;

  const now = new Date();
  const diffMs = matchDate.getTime() - now.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  return diffMs <= weekMs && diffMs > hourMs;
};

type MatchOutcomeStats = {
  points: number;
  playedMatches: number;
  wonMatches: number;
  lostMatches: number;
  tiedMatches: number;
  notPlayedMatches: number;
};

const emptyMatchOutcomeStats = (): MatchOutcomeStats => ({
  points: 0,
  playedMatches: 0,
  wonMatches: 0,
  lostMatches: 0,
  tiedMatches: 0,
  notPlayedMatches: 0,
});

const getMatchOutcomeStats = (
  prediction: unknown,
  winner: unknown,
  participated: boolean,
): MatchOutcomeStats => {
  if (!winner) return emptyMatchOutcomeStats();

  if (!participated) {
    return {
      points: -10,
      playedMatches: 0,
      wonMatches: 0,
      lostMatches: 0,
      tiedMatches: 0,
      notPlayedMatches: 1,
    };
  }

  const normalizedPrediction = normalizeAnswer(prediction);
  const normalizedWinner = normalizeAnswer(winner);

  if (!normalizedWinner) return emptyMatchOutcomeStats();

  if (isTieResult(normalizedWinner)) {
    if (isTieResult(normalizedPrediction)) {
      return {
        points: 10,
        playedMatches: 1,
        wonMatches: 0,
        lostMatches: 0,
        tiedMatches: 1,
        notPlayedMatches: 0,
      };
    }

    return {
      points: -10,
      playedMatches: 1,
      wonMatches: 0,
      lostMatches: 1,
      tiedMatches: 0,
      notPlayedMatches: 0,
    };
  }

  if (normalizedPrediction === normalizedWinner) {
    return {
      points: 10,
      playedMatches: 1,
      wonMatches: 1,
      lostMatches: 0,
      tiedMatches: 0,
      notPlayedMatches: 0,
    };
  }

  return {
    points: -10,
    playedMatches: 1,
    wonMatches: 0,
    lostMatches: 1,
    tiedMatches: 0,
    notPlayedMatches: 0,
  };
};

const getStatDelta = (next: MatchOutcomeStats, prev: MatchOutcomeStats) => ({
  points: next.points - prev.points,
  playedMatches: next.playedMatches - prev.playedMatches,
  wonMatches: next.wonMatches - prev.wonMatches,
  lostMatches: next.lostMatches - prev.lostMatches,
  tiedMatches: next.tiedMatches - prev.tiedMatches,
  notPlayedMatches: next.notPlayedMatches - prev.notPlayedMatches,
});

// Demo data fallback for when Firebase is unavailable
const demoDemoMatches: Match[] = [
  {
    matchId: 'demo-1',
    homeTeam: 'Mexico',
    awayTeam: 'South Africa',
    team1: 'Mexico',
    team2: 'South Africa',
    date: new Date().toISOString(),
    location: 'Mexico City Stadium',
    status: 'OPEN',
    winner: null
  },
  {
    matchId: 'demo-2',
    homeTeam: 'Brazil',
    awayTeam: 'Argentina',
    team1: 'Brazil',
    team2: 'Argentina',
    date: new Date(Date.now() - 86400000).toISOString(),
    location: 'Estadio Mineirão',
    status: 'COMPLETED',
    winner: 'Brazil'
  }
];

export const getMatches = async (): Promise<Match[]> => {
  try {
    const q = query(collection(db, 'matches'),
      // orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn('No matches found in Firestore, using demo data');
      return demoDemoMatches;
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data() as any;


      const match: Match = {
        id: doc.id,
        matchId: data.matchId || doc.id,
        homeTeam: data.home_team || data.team1,
        awayTeam: data.away_team || data.team2,
        team1: data.home_team || data.team1,
        team2: data.away_team || data.team2,
        date: convertFirestoreTimestamp(data?.kickoff?.ist?.date),
        location: data.location || data.venue || '',
        status: data.status || 'OPEN',
        winner: data.winner || null,
        predictions: data.predictions,
        pendingUsers: data.pendingUsers,
        pointsCalculated: data.pointsCalculated,
        votedRight: data.votedRight || [],
        votedWrong: data.votedWrong || []
      };

      return match;
    });
  } catch (error) {
    console.error('Error fetching matches from Firestore:', error);
    // Return demo data if Firebase fetch fails
    return demoDemoMatches;
  }
};

export const getUpcomingMatches = async (): Promise<Match[]> => {
  try {
    const now = new Date();
    const q = query(
      collection(db, 'matches'),
      where('date', '>', Timestamp.fromDate(now)),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn('No upcoming matches found in Firestore, using demo data for upcoming matches');
      const nowMs = now.getTime();
      return demoDemoMatches.filter(m => {
        try {
          return new Date(m.date).getTime() > nowMs;
        } catch {
          return false;
        }
      });
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data() as any;

      const match: Match = {
        id: doc.id,
        matchId: data.matchId || doc.id,
        homeTeam: data.homeTeam || data.team1,
        awayTeam: data.awayTeam || data.team2,
        team1: data.team1,
        team2: data.team2,
        date: convertFirestoreTimestamp(data.date),
        location: data.location || data.venue || '',
        status: data.status || 'OPEN',
        winner: data.winner || null,
        predictions: data.predictions,
        pendingUsers: data.pendingUsers,
        pointsCalculated: data.pointsCalculated,
        votedRight: data.votedRight || [],
        votedWrong: data.votedWrong || []
      };

      return match;
    });
  } catch (error) {
    console.error('Error fetching upcoming matches from Firestore:', error);
    console.warn('Returning demo upcoming matches due to error');
    const nowMs = new Date().getTime();
    return demoDemoMatches.filter(m => {
      try {
        return new Date(m.date).getTime() > nowMs;
      } catch {
        return false;
      }
    });
  }
};

export const getMatchById = async (matchId: string): Promise<Match | null> => {
  try {
    const matches = await getMatches();
    return matches.find(m => m.matchId === matchId || m.id === matchId) || null;
  } catch (error) {
    console.error('Error fetching match by ID:', error);
    return null;
  }
};

export const submitPrediction = async (
  matchDocId: string,
  userId: string,
  prediction: string
): Promise<boolean> => {
  try {
    const ref = doc(db, 'matches', matchDocId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data() as any;
    const matchDate = getMatchDateFromData(data);
    if (!isSubmissionWindowOpen(matchDate)) {
      return false;
    }

    const preds = Array.isArray(data.predictions) ? data.predictions : [];

    // prevent duplicate prediction by same user
    const existing = preds.find((p: any) => p.userId === userId || p.user === userId || p.user === userId);
    if (existing) return false;

    const newPred = {
      matchId: matchDocId,
      userId,
      prediction,
      submittedAt: new Date().toISOString()
    };

    const updated = [...preds, newPred];
    await updateDoc(ref, { predictions: updated });
    return true;
  } catch (err) {
    console.error('submitPrediction error', err);
    return false;
  }
};

export const finalizeMatch = async (matchDocId: string, winner: string): Promise<boolean> => {
  try {
    const ref = doc(db, 'matches', matchDocId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const data = snap.data() as any;
    const preds = Array.isArray(data.predictions) ? data.predictions : [];
    const previousWinner = data.winner ?? null;
    const users = (await getAllUsers()).filter((u) => (u.role || 'USER').toUpperCase() !== 'ADMIN');

    const batch = writeBatch(db);
    const votedRight: string[] = [];
    const votedWrong: string[] = [];
    const userDeltas = new Map<
      string,
      {
        points: number;
        playedMatches: number;
        wonMatches: number;
        lostMatches: number;
        tiedMatches: number;
        notPlayedMatches: number;
      }
    >();

    const predictionsByUser = new Map<string, any>();
    for (const p of preds) {
      const uid = p.userId || p.user || p.userName || (p.user && p.user.id);
      if (!uid) continue;
      predictionsByUser.set(uid, p);
    }

    for (const user of users) {
      if (!user.id) continue;

      const prediction = predictionsByUser.get(user.id)?.prediction;
      const nextStats = getMatchOutcomeStats(prediction, winner, predictionsByUser.has(user.id));
      const prevStats = getMatchOutcomeStats(
        prediction,
        previousWinner,
        predictionsByUser.has(user.id),
      );
      const delta = getStatDelta(nextStats, prevStats);

      if (predictionsByUser.has(user.id)) {
        if (isTieResult(winner)) {
          if (isTieResult(prediction)) {
            votedRight.push(user.id);
          } else {
            votedWrong.push(user.id);
          }
        } else if (normalizeAnswer(prediction) === normalizeAnswer(winner)) {
          votedRight.push(user.id);
        } else {
          votedWrong.push(user.id);
        }
      }

      if (
        delta.points !== 0 ||
        delta.playedMatches !== 0 ||
        delta.wonMatches !== 0 ||
        delta.lostMatches !== 0 ||
        delta.tiedMatches !== 0 ||
        delta.notPlayedMatches !== 0
      ) {
        userDeltas.set(user.id, delta);
      }
    }

    for (const [uid, delta] of userDeltas.entries()) {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) continue;
      batch.update(userRef, {
        points: increment(delta.points),
        playedMatches: increment(delta.playedMatches),
        wonMatches: increment(delta.wonMatches),
        lostMatches: increment(delta.lostMatches),
        tiedMatches: increment(delta.tiedMatches),
        notPlayedMatches: increment(delta.notPlayedMatches)
      });
    }

    batch.update(ref, {
      status: 'COMPLETED',
      winner: winner,
      votedRight,
      votedWrong,
      pointsCalculated: true
    });

    await batch.commit();
    return true;
  } catch (err) {
    console.error('finalizeMatch error', err);
    return false;
  }
};
