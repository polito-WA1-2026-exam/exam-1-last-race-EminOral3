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
  const [result, setResult] = useState(null);
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
      setResult(null);
      setPhase('planning');
    } catch {
      setStartError('Could not start the game. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleSubmitRoute = useCallback(async (route) => {
    try {
      const res = await API.submitRoute(game.gameId, route);
      setResult(res);
    } catch {
      setResult({ valid: false, score: 0, steps: [], error: true });
    }
    setPhase('execution');
  }, [game]);

  if (!user) return <Navigate replace to="/login" />;
  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  const renderResult = () => {
    if (!result) return <Spinner animation="border" />;
    if (result.error) return <Alert variant="danger">Could not submit the route.</Alert>;
    if (!result.valid) {
      return <Alert variant="warning">Invalid or incomplete route — score: 0 coins.</Alert>;
    }
    return (
      <Alert variant="success">
        Valid route! Final score: <strong>{result.score}</strong> coins.{' '}
        {result.steps.map((s, i) => (
          <span key={i}>
            [{s.from.name} → {s.to.name}: {s.event.effect >= 0 ? '+' : ''}{s.event.effect} → {s.coins}]{' '}
          </span>
        ))}
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
      {phase === 'execution' && renderResult()}
    </>
  );
}

export default GamePage;