import React from 'react';
import { Match } from '../../models/Match';
import { formatMatchDate } from '../../utils/dateUtils';
import './MatchCard.css';

interface MatchCardProps {
  match: Match;
}

const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  return (
    <article className="match-card">
      <div className="match-card__teams">
        <span>{match.homeTeam}</span>
        <span>vs</span>
        <span>{match.awayTeam}</span>
      </div>
      <div className="match-card__info">
        <span>{formatMatchDate(match.kickoff?.ist || match.date)}</span>
        <span>{match.location}</span>
      </div>
    </article>
  );
};

export default MatchCard;
