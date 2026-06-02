import { User } from "../models/User";
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

export const getCurrentUser = (): User | null => {
  const user = localStorage.getItem('currentUser');

  if (!user) return null;

  return JSON.parse(user);
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem('currentUser', JSON.stringify(user));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('currentUserUpdated'));
  }
};

export const fetchUserById = async (id: string): Promise<User | null> => {
  try {
    const ref = doc(db, 'users', id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data() as any;

    const user: User = {
      id: snap.id,
      name: data.name || snap.id,
      role: data.role || 'USER',
      points: typeof data.points === 'number' ? data.points : 0,
      playedMatches: typeof data.playedMatches === 'number' ? data.playedMatches : 0,
      wonMatches: typeof data.wonMatches === 'number' ? data.wonMatches : 0,
      lostMatches: typeof data.lostMatches === 'number' ? data.lostMatches : 0,
      tiedMatches: typeof data.tiedMatches === 'number' ? data.tiedMatches : 0,
      notPlayedMatches: typeof data.notPlayedMatches === 'number' ? data.notPlayedMatches : 0
    };

    return user;
  } catch (err) {
    console.error('fetchUserById error', err);
    return null;
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const q = collection(db, 'users');
    const snap = await getDocs(q);
    if (snap.empty) return [];

    return snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        name: data.name || d.id,
        role: data.role || 'USER',
        points: typeof data.points === 'number' ? data.points : 0,
        playedMatches: typeof data.playedMatches === 'number' ? data.playedMatches : 0,
        wonMatches: typeof data.wonMatches === 'number' ? data.wonMatches : 0,
        lostMatches: typeof data.lostMatches === 'number' ? data.lostMatches : 0,
        tiedMatches: typeof data.tiedMatches === 'number' ? data.tiedMatches : 0,
        notPlayedMatches: typeof data.notPlayedMatches === 'number' ? data.notPlayedMatches : 0
      } as User;
    });
  } catch (err) {
    console.error('getAllUsers error', err);
    return [];
  }
};
