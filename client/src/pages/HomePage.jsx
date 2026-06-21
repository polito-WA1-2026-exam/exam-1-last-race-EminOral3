import { useContext } from 'react';
import { Button, Card, ListGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext.js';

// The homepage is open to both guest and logged-in users. It lists the game rules. 
// Below it: a "Start a new game" button if logged in, 
// and a "You are browsing as a guest, log in to play" message if not logged in. 
// This meets the Spec's "anonymous users see only instructions" clause.

function HomePage() {
  const { user } = useContext(AuthContext);

  return (
    <div>
      <h1 className="mb-3">Last Race</h1>
      <p className="lead">
        Plan a route across the Istanbul metro network and reach your
        destination with as many coins as you can before time runs out.
      </p>

      <Card className="mb-4">
        <Card.Header>How to play</Card.Header>
        <ListGroup variant="flush">
          <ListGroup.Item>
            Each game starts with <strong>20 coins</strong>. You get a random
            start and destination station.
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>Setup:</strong> study the full network map (stations, lines
            and interchanges).
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>Planning:</strong> you have <strong>90 seconds</strong>. The
            lines disappear; using only the list of connected station pairs,
            rebuild a route from start to destination, one segment at a time.
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>Execution:</strong> a random event happens on every segment,
            adding or removing coins.
          </ListGroup.Item>
          <ListGroup.Item>
            <strong>Result:</strong> your score is the coins you have left. An
            invalid or incomplete route scores zero.
          </ListGroup.Item>
        </ListGroup>
      </Card>

      {user ? (
        <Button size="lg" as={Link} to="/game">Start a new game</Button>
      ) : (
        <Card body className="bg-light">
          You are browsing as a guest. <Link to="/login">Log in</Link> to see the
          network map and play.
        </Card>
      )}
    </div>
  );
}

export default HomePage;