import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext.js';

function RankingPage() {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate replace to="/login" />;

  return <Alert variant="info">The ranking page will be implemented later.</Alert>;
}

export default RankingPage;