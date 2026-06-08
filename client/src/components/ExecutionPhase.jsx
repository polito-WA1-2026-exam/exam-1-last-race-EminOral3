import { useEffect, useState } from 'react';
import { Card, ListGroup, Badge, Button, Row, Col } from 'react-bootstrap';
import NetworkMap from './NetworkMap.jsx';

const STEP_DELAY_MS = 1200;
const STARTING_COINS = 20;

// Reveals the journey one segment at a time: each step shows the random event
// and the updated coin total, while the route is drawn progressively on the map.
function ExecutionPhase({ result, stations, onDone }) {
  const { steps, start, destination } = result;
  const [revealed, setRevealed] = useState(0);

  // Reveal one more step every STEP_DELAY_MS until all are shown (StrictMode-safe).
  useEffect(() => {
    if (revealed >= steps.length) return undefined;
    const id = setTimeout(() => setRevealed((c) => c + 1), STEP_DELAY_MS);
    return () => clearTimeout(id);
  }, [revealed, steps.length]);

  const coins = revealed === 0 ? STARTING_COINS : steps[revealed - 1].coins;
  const currentId = revealed === 0 ? start.id : steps[revealed - 1].to.id;
  const routeSegments = steps.slice(0, revealed).map((s) => [s.from.id, s.to.id]);
  const done = revealed >= steps.length;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Execution</h2>
        <Badge
          bg={coins >= STARTING_COINS ? 'success' : coins >= 0 ? 'secondary' : 'danger'}
          style={{ fontSize: '1.3rem' }}
        >
          {coins} coins
        </Badge>
      </div>
      <Row>
        <Col md={7}>
          <NetworkMap
            stations={stations}
            lines={[]}
            showLines={false}
            startId={start.id}
            destId={destination.id}
            routeSegments={routeSegments}
            currentId={currentId}
          />
        </Col>
        <Col md={5}>
          <Card>
            <Card.Header>Journey</Card.Header>
            <ListGroup variant="flush" style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {steps.slice(0, revealed).map((s, i) => (
                <ListGroup.Item key={i} className="d-flex justify-content-between align-items-start">
                  <div className="me-2">
                    <div><strong>{s.from.name} → {s.to.name}</strong></div>
                    <small className="text-muted">{s.event.description}</small>
                  </div>
                  <div className="text-end" style={{ minWidth: 64 }}>
                    <Badge bg={s.event.effect > 0 ? 'success' : s.event.effect < 0 ? 'danger' : 'secondary'}>
                      {s.event.effect >= 0 ? '+' : ''}{s.event.effect}
                    </Badge>
                    <div><small>{s.coins} coins</small></div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
          {done && (
            <div className="d-grid mt-3">
              <Button size="lg" onClick={onDone}>See final score</Button>
            </div>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default ExecutionPhase;