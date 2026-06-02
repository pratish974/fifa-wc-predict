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

const convertFirestoreTimestamp = (value: any): string => {
  if (!value) return new Date().toISOString();
  
  // Handle Firestore Timestamp objects
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  
  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // Handle ISO strings
  if (typeof value === 'string') {
    return value;
  }
  
  // Handle numeric timestamps (milliseconds)
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  
  return new Date().toISOString();
};

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
        pointsCalculated: data.pointsCalculated
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
      return [];
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
        pointsCalculated: data.pointsCalculated
      };

      return match;
    });
  } catch (error) {
    console.error('Error fetching upcoming matches from Firestore:', error);
    return [];
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
    if (data.status === 'COMPLETED') return false;

    const preds = Array.isArray(data.predictions) ? data.predictions : [];

    const batch = writeBatch(db);

    const votedRight: string[] = [];
    const votedWrong: string[] = [];

    for (const p of preds) {
      const uid = p.userId || p.user || p.userName || p.user?.id;
      if (!uid) continue;

      // scoring rules: if winner is 'TIED' then correct predictions ("TIED") get 0, incorrect -10
      // otherwise predicted === winner => +10, else -10
      let delta = 0;
      if (winner === 'TIED') {
        if ((p.prediction || '').toString().toLowerCase() === 'tied' || (p.prediction || '').toString().toLowerCase() === 'tie' || (p.prediction || '').toString().toLowerCase() === 'tied') {
          delta = 0;
          votedRight.push(uid);
        } else {
          delta = -10;
          votedWrong.push(uid);
        }
      } else {
        if ((p.prediction || '').toString().toLowerCase() === (winner || '').toString().toLowerCase()) {
          delta = 10;
          votedRight.push(uid);
        } else {
          delta = -10;
          votedWrong.push(uid);
        }
      }

      const userRef = doc(db, 'users', uid);
      batch.update(userRef, { points: increment(delta) });
    }

    // update match doc: set status COMPLETED, winner, votedRight/votedWrong lists
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
