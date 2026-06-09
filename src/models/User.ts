export interface User {
  id: string;
  name: string;
  role: "ADMIN" | "USER";
  points: number;
  playedMatches?: number;
  wonMatches?: number;
  lostMatches?: number;
  tiedMatches?: number;
  notPlayedMatches?: number;
}
