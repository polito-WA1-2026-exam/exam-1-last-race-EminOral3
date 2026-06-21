import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Row, Col, Card, Badge, ListGroup, Button, ProgressBar } from 'react-bootstrap';
import NetworkMap from './NetworkMap.jsx';

const PLANNING_SECONDS = 90;

// Undirected key so a segment is recognised regardless of direction.
function segKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function PlanningPhase({ game, onSubmit }) {
  const { start, destination, stations, segments } = game;

  const [route, setRoute] = useState([]); // ordered selected segments [{from:{id,name}, to:{id,name}}]
  const [remaining, setRemaining] = useState(PLANNING_SECONDS);
  // Lazy initializer: deadline is fixed at mount, not recalculated on re-renders.
  // Drift-free: remaining time is always computed from the fixed deadline vs Date.now().
  const [deadline] = useState(() => Date.now() + PLANNING_SECONDS * 1000);

  // Guard against double-submission (timer expiry and manual submit racing).
  // A ref is used instead of state because it updates synchronously.
  const submittedRef = useRef(false);
  const routeRef = useRef(route);
  routeRef.current = route;

  const usedKeys = useMemo(
    () => new Set(route.map((seg) => segKey(seg.from.id, seg.to.id))),
    [route]
  );

  // Submit once (manual click or timeout). Reads the latest route via ref.
  const doSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const payload = routeRef.current.map((seg) => [seg.from.id, seg.to.id]);
    onSubmit(payload);
  }, [onSubmit]);

  // 90-second countdown based on the fixed deadline (StrictMode-safe).
  useEffect(() => {
    const tick = () => {
      const secs = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) {
        clearInterval(id);
        doSubmit();
      }
    };
    const id = setInterval(tick, 250);
    tick();
    return () => clearInterval(id);
  }, [deadline, doSubmit]);

  // Free selection: the player may add ANY not-yet-used segment, in the order
  // they intend to travel it. Building a consistent path that starts at the
  // start, ends at the destination and never reuses a segment is the player's
  // responsibility; the server validates the whole sequence on submission.
  const addSegment = (seg) => {
    if (usedKeys.has(segKey(seg.from.id, seg.to.id))) return;
    setRoute((r) => [...r, { from: seg.from, to: seg.to }]);
  };

  const removeLast = () => setRoute((r) => r.slice(0, -1));

  const routeSegments = route.map((seg) => [seg.from.id, seg.to.id]);
  const timerVariant = remaining <= 15 ? 'danger' : remaining <= 30 ? 'warning' : 'success';

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h2 className="mb-0">Planning</h2>
        <Badge bg={timerVariant} style={{ fontSize: '1.1rem' }}>{remaining}s</Badge>
      </div>
      <ProgressBar now={(remaining / PLANNING_SECONDS) * 100} variant={timerVariant} className="mb-3" />
      <p>
        Build a route from <Badge bg="success">{start.name}</Badge> to{' '}
        <Badge bg="danger">{destination.name}</Badge> by selecting the connections
        in the order you would travel them. The route is checked when you submit
        (or when the time runs out).
      </p>

      <Row>
        <Col md={7}>
          <NetworkMap
            stations={stations}
            lines={[]}
            showLines={false}
            startId={start.id}
            destId={destination.id}
            routeSegments={routeSegments}
          />
        </Col>
        <Col md={5}>
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Selected segments ({route.length})</span>
              <Button variant="outline-secondary" size="sm" onClick={removeLast} disabled={route.length === 0}>
                Undo last
              </Button>
            </Card.Header>
            <Card.Body>
              {route.length === 0 ? (
                <span className="text-muted">No segments selected yet.</span>
              ) : (
                <ol className="mb-0 ps-3">
                  {route.map((seg, i) => (
                    <li key={i}>{seg.from.name} — {seg.to.name}</li>
                  ))}
                </ol>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>Connections — tap to add (in travel order)</Card.Header>
            <ListGroup variant="flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {segments.map((seg) => {
                const used = usedKeys.has(segKey(seg.from.id, seg.to.id));
                return (
                  <ListGroup.Item
                    key={`${seg.from.id}-${seg.to.id}`}
                    action={!used}
                    disabled={used}
                    onClick={() => !used && addSegment(seg)}
                    className={used ? 'text-decoration-line-through text-muted' : ''}
                  >
                    {seg.from.name} — {seg.to.name}
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </Card>

          <div className="d-grid mt-3">
            <Button variant="primary" size="lg" onClick={doSubmit} disabled={route.length === 0}>
              Submit route
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default PlanningPhase;