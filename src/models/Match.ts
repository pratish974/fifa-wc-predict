import { Prediction } from "./Prediction";

export interface Match {
  // Firestore document id (some services return `id`)
  id?: string;

  // canonical id used across the app
  matchId?: string;

  // team naming: some components expect `homeTeam`/`awayTeam`, others use `team1`/`team2`
  homeTeam?: string;
  awayTeam?: string;
  team1?: string;
  team2?: string;

  group?: string;

  date: any;
  kickoff?: {
    ist?: {
      date?: string;
      time?: string;
    };
    [key: string]: any;
  };
  stage?: string;
  location?: string;
  status?: 'OPEN' | 'COMPLETED';

  winner?: string | null;

  predictions?: Prediction[];

  votedRight?: string[];
  votedWrong?: string[];

  pendingUsers?: string[];

  pointsCalculated?: boolean;
}
