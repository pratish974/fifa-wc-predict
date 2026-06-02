import React from 'react';
import { Navigate } from 'react-router-dom';
import useCurrentUser from '../hooks/useCurrentUser';
import Loading from '../components/Loading/Loading';

type Props = {
  children: JSX.Element;
};

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { user, loading } = useCurrentUser();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
