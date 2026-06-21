import { Card, Button, ListGroup, Badge } from 'react-bootstrap';

const STARTING_COINS = 20;

// A tiny dependency-free SVG sparkline of the running coin total across the
// journey (starting from STARTING_COINS), with a dashed zero baseline.
function CoinSparkline({ series }) {
  if (!series || series.length < 2) return null;

  const W = 480;
  const H = 96;
  const padX = 12;
  const padTop = 16;
  const padBottom = 20;

  const minV = Math.min(0, ...series);
  const maxV = Math.max(STARTING_COINS, ...series);
  const span = maxV - minV || 1;

  // x: maps step index to horizontal position.
  // y: maps coin value to vertical position (inverted: higher coins = lower y).
  const x = (i) => padX + (i / (series.length - 1)) * (W - 2 * padX);
  const y = (v) => padTop + (1 - (v - minV) / span) * (H - padTop - padBottom);

  const points = series.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = series[series.length - 1];
  const endColor = last >= STARTING_COINS ? '#198754' : last > 0 ? '#6c757d' : '#dc3545';
  const showZero = minV <= 0 && maxV >= 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 110 }}
         role="img" aria-label="Coin total over the journey">
      {showZero && (
        <line x1={padX} y1={y(0)} x2={W - padX} y2={y(0)}
              stroke="#adb5bd" strokeWidth={1} strokeDasharray="4 4" />
      )}
      <polyline points={points} fill="none" stroke="#0d6efd"
                strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* start marker */}
      <circle cx={x(0)} cy={y(series[0])} r={4} fill="#6c757d" />
      <text x={x(0)} y={y(series[0]) - 8} fontSize={12} fill="#6c757d" textAnchor="start">
        {series[0]}
      </text>
      {/* end marker */}
      <circle cx={x(series.length - 1)} cy={y(last)} r={5} fill={endColor} />
      <text x={x(series.length - 1)} y={y(last) - 9} fontSize={13} fill={endColor}
            textAnchor="end" fontWeight="bold">
        {last}
      </text>
    </svg>
  );
}

// Final screen: shows the score, a recap of the journey, and a new-game button.
function ResultPhase({ result, onNewGame }) {
  const { valid, score, steps, start, destination, serverError } = result;
  
  // Recap is only shown for valid routes that have steps; invalid routes score
  // zero and skip straight to the score card with no journey breakdown.
  const hasRecap = valid && Array.isArray(steps) && steps.length > 0;
  
  // series[0] = 20 (starting coins); each subsequent value is the running total
  // after that segment's event, matching what ExecutionPhase displayed live.
  const series = hasRecap ? [STARTING_COINS, ...steps.map((s) => s.coins)] : [];

  return (
    <div className="mx-auto" style={{ maxWidth: 640 }}>
      <Card className="text-center">
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

      {hasRecap && (
        <Card className="mt-3">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <span>Journey recap</span>
            <small className="text-muted">{start?.name} → {destination?.name}</small>
          </Card.Header>
          <Card.Body className="pb-1">
            <CoinSparkline series={series} />
          </Card.Body>
          <ListGroup variant="flush">
            {steps.map((s, i) => (
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
      )}
    </div>
  );
}

export default ResultPhase;