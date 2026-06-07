import { Card } from 'react-bootstrap';

// Renders the underground network as an SVG.
//  - showLines: draw the coloured lines (Setup) or hide them (Planning).
//  - startId/destId: optionally highlight the assigned stations.
// Everything is declarative React/SVG: no direct DOM manipulation.
function NetworkMap({ stations, lines, showLines = true, startId, destId }) {
  const byId = new Map(stations.map((s) => [s.id, s]));

  // Compute a viewBox with padding around the station coordinates.
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
          {/* Lines first, so the station markers sit on top of them. */}
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

          {/* Station markers + labels. */}
          {stations.map((s) => {
            const isStart = s.id === startId;
            const isDest = s.id === destId;
            let fill = '#ffffff';
            let stroke = '#333333';
            if (isStart) { fill = '#198754'; stroke = '#0f5132'; }
            else if (isDest) { fill = '#dc3545'; stroke = '#842029'; }
            const r = s.interchange ? 10 : 6;
            return (
              <g key={s.id}>
                <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke={stroke} strokeWidth={3} />
                <text x={s.x + 14} y={s.y + 5} fontSize={14} fill="#212529"
                      style={{ userSelect: 'none' }}>
                  {s.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend (only meaningful when lines are shown). */}
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