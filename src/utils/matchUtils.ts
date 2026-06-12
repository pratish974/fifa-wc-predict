import { Match } from '../models/Match';
import { parseMatchDate } from './dateUtils';

export const isMatchComplete = (match: Match): boolean => {
  const matchDate = parseMatchDate(match.kickoff?.ist || match.kickoff || match.date);
  return matchDate ? matchDate < new Date() : false;
};
