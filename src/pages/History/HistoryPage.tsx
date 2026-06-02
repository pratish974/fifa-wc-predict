import React from 'react';
import Header from '../../components/Header/Header';

const HistoryPage: React.FC = () => {
  return (
    <div>
      <Header title="Prediction History" />
      <main style={{ padding: '24px' }}>
        <h1>History</h1>
        <p>Review past predictions and match results.</p>
      </main>
    </div>
  );
};

export default HistoryPage;
