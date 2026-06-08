import { Card, Button } from 'react-bootstrap';

// Final screen: shows the score and offers a new game.
function ResultPhase({ result, onNewGame }) {
  const { valid, score, destination, serverError } = result;

  return (
    <Card className="text-center mx-auto" style={{ maxWidth: 520 }}>
      <Card.Body>
        <Card.Title as="h2">Result</Card.Title>

        {serverError ? (
          <p className="mt-3 text-danger">
            Something went wrong submitting your route. Please start a new game.
          </p>
        ) : valid ? (
          <p className="mt-3">You reached <strong>{destination?.name}</strong>!</p>
        ) : (
          <p className="mt-3 text-muted">
            Your route was invalid or incomplete, so you lost all your coins.
          </p>
        )}

        {!serverError && (
          <div className="my-4">
            <div className="display-3 fw-bold">{score}</div>
            <div className="text-muted">coins</div>
          </div>
        )}

        <Button size="lg" onClick={onNewGame}>New game</Button>
      </Card.Body>
    </Card>
  );
}

export default ResultPhase;