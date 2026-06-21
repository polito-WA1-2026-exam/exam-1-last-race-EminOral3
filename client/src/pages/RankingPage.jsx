import { useContext, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Table, Spinner, Alert, Badge } from 'react-bootstrap';
import AuthContext from '../contexts/AuthContext.js';
import API from '../API.js';

function RankingPage() {
  const { user } = useContext(AuthContext);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Same StrictMode-safe ignore pattern as GamePage: prevents a stale setState
  // if the effect is cleaned up before the fetch resolves.
  useEffect(() => {
    let ignore = false;
    setLoading(true);
    API.getRanking()
      .then((data) => { if (!ignore) { setRanking(data); setError(''); } })
      .catch(() => { if (!ignore) setError('Could not load the ranking.'); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  // Protected page: redirect guests to login instead of rendering.
  if (!user) return <Navigate replace to="/login" />;
  if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <h1 className="mb-3">General ranking</h1>
      {ranking.length === 0 ? (
        <Alert variant="info">No games have been played yet.</Alert>
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Best score</th>
              <th>Games played</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, i) => (
              <tr key={row.id} className={row.id === user.id ? 'table-primary' : ''}>
                <td>{i + 1}</td>
                <td>
                  {row.name}{' '}
                  {row.id === user.id && <Badge bg="primary">you</Badge>}
                </td>
                <td>{row.bestScore}</td>
                <td>{row.gamesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export default RankingPage;