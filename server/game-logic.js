// Pure game-logic helpers (no database access), so they are easy to unit-test.
// They operate on `lines`: array of { id, name, color, stations: [orderedIds] }.

// Build an undirected adjacency Map<stationId, Set<stationId>> from the lines.
export function buildAdjacency(lines) {
  const adj = new Map();
  const add = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  for (const line of lines) {
    const seq = line.stations;
    for (let i = 0; i + 1 < seq.length; i++) {
      add(seq[i], seq[i + 1]);
      add(seq[i + 1], seq[i]);
    }
  }
  return adj;
}

// BFS shortest distances (in segments) from `src` to all reachable stations.
export function shortestDistances(adj, src) {
  const dist = new Map([[src, 0]]);
  const queue = [src];
  while (queue.length) {
    const u = queue.shift();
    for (const v of adj.get(u) || []) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u) + 1);
        queue.push(v);
      }
    }
  }
  return dist;
}

// Pick a random start and a random destination with shortest distance >= minDistance.
export function chooseStartAndDest(stations, lines, minDistance = 3) {
  const adj = buildAdjacency(lines);
  const ids = stations.map((s) => s.id);
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  for (const startId of shuffled) {
    const dist = shortestDistances(adj, startId);
    const candidates = [...dist.entries()]
      .filter(([, d]) => d >= minDistance)
      .map(([id]) => id);
    if (candidates.length > 0) {
      const destId = candidates[Math.floor(Math.random() * candidates.length)];
      return { startId, destId };
    }
  }
  throw new Error('No valid start/destination pair found.');
}

// All distinct undirected segments as { a, b } with a < b (the planning list).
export function listSegments(lines) {
  const set = new Set();
  for (const line of lines) {
    const seq = line.stations;
    for (let i = 0; i + 1 < seq.length; i++) {
      const a = Math.min(seq[i], seq[i + 1]);
      const b = Math.max(seq[i], seq[i + 1]);
      set.add(`${a}-${b}`);
    }
  }
  return [...set].map((key) => {
    const [a, b] = key.split('-').map(Number);
    return { a, b };
  });
}

// Validate an ordered list of segment pairs [[fromId, toId], ...] against the
// network. The route is valid iff it is a contiguous walk of real edges from
// startId to destId that never reuses a segment. (The "line change only at
// interchange" rule is automatically satisfied: switching lines is only
// physically possible at a station served by both lines, i.e. an interchange.)
export function validateRoute(routePairs, startId, destId, adj) {
  if (!Array.isArray(routePairs) || routePairs.length === 0) {
    return { valid: false, reason: 'empty' };
  }
  const usedKeys = new Set();
  let current = startId;
  for (const pair of routePairs) {
    if (!Array.isArray(pair) || pair.length !== 2) return { valid: false, reason: 'malformed' };
    const a = Number(pair[0]);
    const b = Number(pair[1]);
    let next;
    if (a === current) next = b;
    else if (b === current) next = a;
    else return { valid: false, reason: 'not-contiguous' };
    if (!adj.has(a) || !adj.get(a).has(b)) return { valid: false, reason: 'no-such-segment' };
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (usedKeys.has(key)) return { valid: false, reason: 'repeated-segment' };
    usedKeys.add(key);
    current = next;
  }
  if (current !== destId) return { valid: false, reason: 'wrong-destination' };
  return { valid: true };
}

// Apply a random event to each segment of a (valid) route.
//  - route: [{ from:{id,name}, to:{id,name} }, ...]
//  - rng: injectable random in [0,1) (defaults to Math.random) for testability.
// The running coin total may go negative mid-journey; the final score is
// clamped to zero if negative.
export function executeRoute(route, startCoins, events, rng = Math.random) {
  let coins = startCoins;
  const steps = route.map((seg) => {
    const event = events[Math.floor(rng() * events.length)];
    coins += event.effect;
    return {
      from: seg.from,
      to: seg.to,
      event: { description: event.description, effect: event.effect },
      coins,
    };
  });
  return { steps, finalScore: Math.max(0, coins) };
}