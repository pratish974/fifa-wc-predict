import React from 'react';
import { Leaderboard } from '../../models/Leaderboard';
import './LeaderboardTable.css';

interface LeaderboardTableProps {
  rows: Leaderboard[];
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ rows }) => {
  return (
    <table className="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>User</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.userId}>
            <td>{index + 1}</td>
            <td>{row.username}</td>
            <td>{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LeaderboardTable;
