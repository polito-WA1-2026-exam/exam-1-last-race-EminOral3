import db from '../db.js';

// Promise wrapper around the callback-based sqlite3 API, so DAOs can use async/await.
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// All stations with their map coordinates.
export async function getStations() {
  return all('SELECT id, name, x, y FROM stations ORDER BY id');
}

// All lines, each enriched with its ordered list of station ids (defines the segments).
export async function getLines() {
  const lines = await all('SELECT id, name, color FROM metro_lines ORDER BY id');
  const links = await all(
    'SELECT line_id, station_id, position FROM line_stations ORDER BY line_id, position'
  );
  return lines.map((line) => ({
    ...line,
    stations: links
      .filter((r) => r.line_id === line.id)
      .sort((a, b) => a.position - b.position)
      .map((r) => r.station_id),
  }));
}

// The full network for the Setup phase: stations (with an "interchange" flag
// derived from line membership) and lines (with their ordered stations).
export async function getNetwork() {
  const stations = await getStations();
  const lines = await getLines();

  // The interchange flag is not stored in the DB; it is derived here from
  // line membership — a station on more than one line is an interchange.
  const lineCount = {};
  for (const line of lines) {
    for (const sid of line.stations) {
      lineCount[sid] = (lineCount[sid] || 0) + 1;
    }
  }

  const stationsWithFlag = stations.map((s) => ({
    ...s,
    interchange: (lineCount[s.id] || 0) > 1,
  }));

  return { stations: stationsWithFlag, lines };
}