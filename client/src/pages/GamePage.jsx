import { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner, Alert } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext.js';
import API from '../API.js';
import SetupPhase from '../components/SetupPhase.jsx';
import PlanningPhase from '../components/PlanningPhase.jsx';

function GamePage() {
  const { user } = useContext(AuthContext);

  const [phase, setPhase] = useState('setup'); // setup | planning | execution | result
  const [network, setNetwork] = useState(null);
  const [game, setGame] = useState(null);
  const [submittedRoute, setSubmittedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    API.getNetwork()
      .then((data) => { if (!ignore) { setNetwork(data); setError(''); } })
      .catch(() => { if (!ignore) setError('Could not load the network. Please try again.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const startPlanning = async () => {
    setStarting(true);
    setStartError('');
    try {
      const data = await API.startGame();
      setGame(data);
      setPhase('planning');
    } catch {
      setStartError('Could not start the game. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  // Stable callback so PlanningPhase's timer effect does not re-create itself.
  const handleSubmitRoute = useCallback((route) => {
    setSubmittedRoute(route);
    setPhase('execution');
  }, []);

  if (!user) return <Navigate replace to="/login" />;
  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  // Temporary execution view: shows the submitted route (real execution next phase).
  const renderSubmitted = () => {
    if (!submittedRoute || submittedRoute.length === 0) {
      return <Alert variant="warning">No route was submitted (you will score zero).</Alert>;
    }
    const nameById = new Map(game.stations.map((s) => [s.id, s.name]));
    const path = [nameById.get(submittedRoute[0][0]),
                  ...submittedRoute.map(([, to]) => nameById.get(to))];
    return (
      <Alert variant="info">
        Submitted route ({submittedRoute.length} segments): {path.join(' → ')}.
        Execution and scoring come in the next phase.
      </Alert>
    );
  };

  return (
    <>
      {phase === 'setup' && (
        <SetupPhase network={network} onReady={startPlanning} starting={starting} error={startError} />
      )}
      {phase === 'planning' && game && (
        <PlanningPhase game={game} onSubmit={handleSubmitRoute} />
      )}
      {phase === 'execution' && renderSubmitted()}
    </>
  );
}

export default GamePage;