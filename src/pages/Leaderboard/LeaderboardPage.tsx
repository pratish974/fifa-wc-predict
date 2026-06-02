import React from 'react';
import Header from '../../components/Header/Header';
import LeaderboardTable from '../../components/LeaderboardTable/LeaderboardTable';
import { Leaderboard } from '../../models/Leaderboard';

const sampleRows: Leaderboard[] = [
  { userId: 'user-1', username: 'Player1', points: 180 },
  { userId: 'user-2', username: 'Player2', points: 150 },
  { userId: 'user-3', username: 'Player3', points: 132 },
];

const LeaderboardPage: React.FC = () => {
  return (
    <div>
      <Header title="Leaderboard" />
      <main style={{ padding: '24px' }}>
        <LeaderboardTable rows={sampleRows} />
      </main>
    </div>
  );
};

export default LeaderboardPage;
