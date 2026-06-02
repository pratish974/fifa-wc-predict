export interface Leaderboard {
  userId: string;
  username: string;
  points: number;
  playedMatches: number;
  wonMatches: number;
  lostMatches: number;
  tiedMatches: number;
  notPlayedMatches: number;
}
