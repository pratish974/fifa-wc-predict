import { Match } from '../models/Match';

export const isMatchComplete = (match: Match): boolean => {
  return new Date(match.date) < new Date();
};
