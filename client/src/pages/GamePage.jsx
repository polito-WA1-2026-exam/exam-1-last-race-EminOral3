import { useCallback, useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner, Alert } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext.js';
import API from '../API.js';
import SetupPhase from '../components/SetupPhase.jsx';
import PlanningPhase from '../components/PlanningPhase.jsx';
import ExecutionPhase from '../components/ExecutionPhase.jsx';
import ResultPhase from '../components/ResultPhase.jsx';

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
      // Valid routes are animated in Execution; invalid ones skip straight to Result.
      setPhase(res.valid ? 'execution' : 'result');
    } catch {
      setResult({ valid: false, score: 0, steps: [], serverError: true });
      setPhase('result');
    }
  }, [game]);

  const newGame = () => {
    setGame(null);
    setResult(null);
    setPhase('setup');
  };

  if (!user) return <Navigate replace to="/login" />;
  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <>
      {phase === 'setup' && (
        <SetupPhase network={network} onReady={startPlanning} starting={starting} error={startError} />
      )}
      {phase === 'planning' && game && (
        <PlanningPhase game={game} onSubmit={handleSubmitRoute} />
      )}
      {phase === 'execution' && result && (
        <ExecutionPhase
          result={result}
          stations={game.stations}
          onDone={() => setPhase('result')}
        />
      )}
      {phase === 'result' && result && (
        <ResultPhase result={result} onNewGame={newGame} />
      )}
    </>
  );
}

export default GamePage;