import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Row, Col, Card, Badge, ListGroup, Button, Alert, ProgressBar } from 'react-bootstrap';
import NetworkMap from './NetworkMap.jsx';

const PLANNING_SECONDS = 90;

// Undirected key so a segment is recognised regardless of direction.
function segKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function PlanningPhase({ game, onSubmit }) {
  const { start, destination, stations, segments } = game;

  const [route, setRoute] = useState([]);  // ordered [{from:{id,name}, to:{id,name}}] in travel direction
  const [remaining, setRemaining] = useState(PLANNING_SECONDS);
  // Fixed deadline -> the countdown is drift-free and survives re-renders.
  const [deadline] = useState(() => Date.now() + PLANNING_SECONDS * 1000);

  const submittedRef = useRef(false);
  const routeRef = useRef(route);
  routeRef.current = route;

  const nameById = useMemo(() => {
    const m = new Map();
    stations.forEach((s) => m.set(s.id, s.name));
    return m;
  }, [stations]);

  const currentEnd = route.length === 0 ? start.id : route[route.length - 1].to.id;
  const usedKeys = useMemo(
    () => new Set(route.map((seg) => segKey(seg.from.id, seg.to.id))),
    [route]
  );
  const isComplete = route.length > 0 && currentEnd === destination.id;

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

  const canSelect = (seg) => {
    if (usedKeys.has(segKey(seg.from.id, seg.to.id))) return false;
    return seg.from.id === currentEnd || seg.to.id === currentEnd;
  };

  const addSegment = (seg) => {
    let fromId;
    let toId;
    if (seg.from.id === currentEnd) { fromId = seg.from.id; toId = seg.to.id; }
    else if (seg.to.id === currentEnd) { fromId = seg.to.id; toId = seg.from.id; }
    else return;
    setRoute((r) => [...r, {
      from: { id: fromId, name: nameById.get(fromId) },
      to: { id: toId, name: nameById.get(toId) },
    }]);
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
      <ProgressBar
        now={(remaining / PLANNING_SECONDS) * 100}
        variant={timerVariant}
        className="mb-3"
      />
      <p>
        From <Badge bg="success">{start.name}</Badge> to{' '}
        <Badge bg="danger">{destination.name}</Badge>. You are at{' '}
        <Badge bg="primary">{nameById.get(currentEnd)}</Badge>.
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
            currentId={currentEnd}
          />
        </Col>
        <Col md={5}>
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span>Your route ({route.length})</span>
              <Button variant="outline-secondary" size="sm"
                      onClick={removeLast} disabled={route.length === 0}>
                Undo last
              </Button>
            </Card.Header>
            <Card.Body>
              {route.length === 0 ? (
                <span className="text-muted">No segments selected yet.</span>
              ) : (
                <div>
                  {start.name}
                  {route.map((seg, i) => (
                    <span key={i}> → {seg.to.name}</span>
                  ))}
                </div>
              )}
              {isComplete && (
                <Alert variant="success" className="mt-2 mb-0 py-2">
                  Route complete — you can submit.
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>Connections — tap the next segment</Card.Header>
            <ListGroup variant="flush" style={{ maxHeight: '320px', overflowY: 'auto' }}>
              {segments.map((seg) => {
                const used = usedKeys.has(segKey(seg.from.id, seg.to.id));
                const selectable = canSelect(seg);
                return (
                  <ListGroup.Item
                    key={`${seg.from.id}-${seg.to.id}`}
                    action={selectable}
                    disabled={!selectable}
                    onClick={() => selectable && addSegment(seg)}
                    className={used ? 'text-decoration-line-through text-muted' : ''}
                  >
                    {seg.from.name} — {seg.to.name}
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          </Card>

          <div className="d-grid mt-3">
            <Button
              variant={isComplete ? 'primary' : 'outline-primary'}
              size="lg"
              onClick={doSubmit}
            >
              Submit route{!isComplete && ' (incomplete = 0 coins)'}
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default PlanningPhase;