import { Card } from 'react-bootstrap';

const LINE_SPACING = 5; // perpendicular gap between lines that share a segment

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
  const padX = 40;
  const padY = 60;
  const labelSpace = 170; // extra room on the right for station labels
  const minX = Math.min(...xs) - padX;
  const minY = Math.min(...ys) - padY;
  const width = Math.max(...xs) - Math.min(...xs) + padX + labelSpace;
  const height = Math.max(...ys) - Math.min(...ys) + 2 * padY;

  // Decorative Bosphorus strait running vertically through the city. Purely
  // ambient (drawn behind the network) to convey the Istanbul setting; it
  // carries no connectivity information, so it is safe to show in every phase.
  const bosL = 478;  // left shoreline base x
  const bosR = 546;  // right shoreline base x
  const bosAmp = 9;  // shoreline wave amplitude
  const bosTop = minY;
  const bosBot = minY + height;
  const bosQ1 = minY + height * 0.25;
  const bosMid = minY + height * 0.5;
  const bosQ3 = minY + height * 0.75;
  const bosPath =
    `M ${bosL},${bosTop} Q ${bosL - bosAmp},${bosQ1} ${bosL},${bosMid} ` +
    `Q ${bosL + bosAmp},${bosQ3} ${bosL},${bosBot} ` +
    `L ${bosR},${bosBot} Q ${bosR + bosAmp},${bosQ3} ${bosR},${bosMid} ` +
    `Q ${bosR - bosAmp},${bosQ1} ${bosR},${bosTop} Z`;
  const bosRipples = [bosQ1, bosMid, bosQ3];


  // Pre-process: group line colors by segment key "a-b" (a<b).
  // Segments shared by N lines get N parallel offset strokes.
  const segmentColors = new Map(); // key "a-b" (a<b) -> { a, b, colors: [...] }
  for (const line of lines) {
    const seq = line.stations;
    for (let i = 0; i + 1 < seq.length; i++) {
      const a = Math.min(seq[i], seq[i + 1]);
      const b = Math.max(seq[i], seq[i + 1]);
      const key = `${a}-${b}`;
      if (!segmentColors.has(key)) segmentColors.set(key, { a, b, colors: [] });
      segmentColors.get(key).colors.push(line.color);
    }
  }

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
          {/* Decorative Bosphorus strait (ambient backdrop, behind everything). */}
          <defs>
            <linearGradient id="bosphorus" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cfe7f5" />
              <stop offset="100%" stopColor="#a9d3ec" />
            </linearGradient>
          </defs>
          <g aria-hidden="true">
            <path d={bosPath} fill="url(#bosphorus)" opacity={0.55} />
            {bosRipples.map((ry, i) => (
              <path
                key={`ripple-${i}`}
                d={`M ${bosL + 6},${ry} q 8,-5 16,0 t 16,0 t 16,0`}
                fill="none" stroke="#ffffff" strokeWidth={1.5} opacity={0.4}
              />
            ))}
            <text
              x={(bosL + bosR) / 2} y={bosMid}
              transform={`rotate(-90 ${(bosL + bosR) / 2} ${bosMid})`}
              textAnchor="middle" fontSize={16} fill="#2b6ea3" opacity={0.5}
              style={{ userSelect: 'none', letterSpacing: 4 }}
            >
              Boğaziçi
            </text>
          </g>


          {/* Coloured lines (Setup only): one stroke per line per segment, with
              parallel offset where several lines share the same segment. */}
          {showLines &&
            [...segmentColors.values()].map((seg) => {
              const A = byId.get(seg.a);
              const B = byId.get(seg.b);
              const dx = B.x - A.x;
              const dy = B.y - A.y;
              const len = Math.hypot(dx, dy) || 1;
              // Perpendicular unit vector. Offset = (k - (n-1)/2) * LINE_SPACING
              // centres the parallel strokes symmetrically around the segment midline.
              const px = -dy / len; 
              const py = dx / len;
              const n = seg.colors.length;
              return seg.colors.map((color, k) => {
                const off = (k - (n - 1) / 2) * LINE_SPACING;
                return (
                  <line
                    key={`${seg.a}-${seg.b}-${k}`}
                    x1={A.x + px * off} y1={A.y + py * off}
                    x2={B.x + px * off} y2={B.y + py * off}
                    stroke={color} strokeWidth={5} strokeLinecap="round" opacity={0.9}
                  />
                );
              });
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
            // Interchange stations are drawn larger. In Planning, stations lack the
            // interchange flag (server withholds it), so all circles render at r=6.
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