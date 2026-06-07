import { Card } from 'react-bootstrap';

// Renders the underground network as an SVG (declarative; no DOM manipulation).
//  - showLines: draw the coloured lines (Setup) or hide them (Planning).
//  - startId/destId: highlight the assigned stations (green/red).
//  - routeSegments: [[aId, bId], ...] edges of the route built so far (highlighted).
//  - currentId: the station the player is currently "at" (extra ring).
function NetworkMap({
  stations,
  lines,
  showLines = true,
  startId,
  destId,
  routeSegments = [],
  currentId,
}) {
  const byId = new Map(stations.map((s) => [s.id, s]));

  const xs = stations.map((s) => s.x);
  const ys = stations.map((s) => s.y);
  const pad = 70;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const width = Math.max(...xs) - Math.min(...xs) + 2 * pad;
  const height = Math.max(...ys) - Math.min(...ys) + 2 * pad;

  return (
    <Card className="mb-3">
      <Card.Body>
        <svg
          viewBox={`${minX} ${minY} ${width} ${height}`}
          width="100%"
          style={{ maxHeight: '520px' }}
          role="img"
          aria-label="Underground network map"
        >
          {/* Coloured lines (Setup only), drawn first. */}
          {showLines &&
            lines.map((line) => {
              const points = line.stations
                .map((sid) => byId.get(sid))
                .filter(Boolean)
                .map((s) => `${s.x},${s.y}`)
                .join(' ');
              return (
                <polyline
                  key={line.id}
                  points={points}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={0.85}
                />
              );
            })}

          {/* Route built so far (highlighted edges). */}
          {routeSegments.map(([aId, bId], i) => {
            const A = byId.get(aId);
            const B = byId.get(bId);
            if (!A || !B) return null;
            return (
              <line
                key={`route-${i}`}
                x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke="#0d6efd" strokeWidth={5} strokeLinecap="round" opacity={0.9}
              />
            );
          })}

          {/* Station markers + labels. */}
          {stations.map((s) => {
            const isStart = s.id === startId;
            const isDest = s.id === destId;
            const isCurrent = s.id === currentId;
            let fill = '#ffffff';
            let stroke = '#333333';
            if (isStart) { fill = '#198754'; stroke = '#0f5132'; }
            else if (isDest) { fill = '#dc3545'; stroke = '#842029'; }
            const r = s.interchange ? 10 : 6;
            return (
              <g key={s.id}>
                {isCurrent && (
                  <circle cx={s.x} cy={s.y} r={r + 6} fill="none" stroke="#0d6efd" strokeWidth={3} />
                )}
                <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke={stroke} strokeWidth={3} />
                <text x={s.x + 14} y={s.y + 5} fontSize={14} fill="#212529"
                      style={{ userSelect: 'none' }}>
                  {s.name}
                </text>
              </g>
            );
          })}
        </svg>

        {showLines && (
          <div className="d-flex flex-wrap gap-3 mt-2">
            {lines.map((line) => (
              <span key={line.id} className="d-flex align-items-center gap-1">
                <span style={{ display: 'inline-block', width: 22, height: 6,
                               backgroundColor: line.color, borderRadius: 3 }} />
                <small>{line.name}</small>
              </span>
            ))}
            <span className="d-flex align-items-center gap-1">
              <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                             background: '#fff', border: '3px solid #333' }} />
              <small>Interchange</small>
            </span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default NetworkMap;