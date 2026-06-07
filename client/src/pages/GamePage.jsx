import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext.js';
import API from '../API.js';
import SetupPhase from '../components/SetupPhase.jsx';

// Orchestrates the four game phases. This phase implements Setup; the others
// are added in later phases.
function GamePage() {
  const { user } = useContext(AuthContext);

  const [phase, setPhase] = useState('setup'); // setup | planning | execution | result
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load the full network for the Setup phase.
  // The `ignore` flag makes this safe under React StrictMode (double-invoked
  // effects in development): the first run's result is discarded on cleanup.
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    API.getNetwork()
      .then((data) => { if (!ignore) { setNetwork(data); setError(''); } })
      .catch(() => { if (!ignore) setError('Could not load the network. Please try again.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  // Only logged-in users can play.
  if (!user) return <Navigate replace to="/login" />;

  if (loading) {
    return <div className="text-center py-5"><Spinner animation="border" /></div>;
  }
  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <>
      {phase === 'setup' && (
        <SetupPhase network={network} onReady={() => setPhase('planning')} />
      )}
      {phase === 'planning' && (
        <Alert variant="info">Planning phase will be implemented in the next phase.</Alert>
      )}
    </>
  );
}

export default GamePage;