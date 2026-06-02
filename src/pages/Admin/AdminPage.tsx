import React from 'react';
import Header from '../../components/Header/Header';

const AdminPage: React.FC = () => {
  return (
    <div>
      <Header title="Admin Panel" />
      <main style={{ padding: '24px' }}>
        <h1>Admin</h1>
        <p>Manage matches, users, and prediction settings.</p>
      </main>
    </div>
  );
};

export default AdminPage;
