import React from 'react';
import { Leaderboard } from '../../models/Leaderboard';
import './LeaderboardTable.css';

interface LeaderboardTableProps {
  rows: Leaderboard[];
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ rows }) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Points</th>
            <th>Played</th>
            <th>Won</th>
            <th>Lost</th>
            <th>Tied</th>
            <th>Not Played</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.userId}>
              <td>{index + 1}</td>
              <td>{row.username}</td>
              <td>{row.points}</td>
              <td>{row.playedMatches}</td>
              <td>{row.wonMatches}</td>
              <td>{row.lostMatches}</td>
              <td>{row.tiedMatches}</td>
              <td>{row.notPlayedMatches}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardTable;
