import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext.js';

function GamePage() {
  const { user } = useContext(AuthContext);

  // Only logged-in users can play.
  if (!user) return <Navigate replace to="/login" />;

  return (
    <Alert variant="info">
      The game (Setup, Planning, Execution, Result) will be implemented in the
      next phases.
    </Alert>
  );
}

export default GamePage;