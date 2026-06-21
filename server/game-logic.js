// Pure game-logic helpers (no database access), so they are easy to unit-test.
// They operate on `lines`: array of { id, name, color, stations: [orderedIds] }.

// All functions take `lines` data as a parameter:
// lines = [{ id, name, color, stations: [sequentialStationIds] }, ...]
// Two consecutive ids in the `stations` array = an edge (segment) on that line.

// Build an undirected adjacency Map<stationId, Set<stationId>> from the lines.
// Why Map + Set?
//   - Map: Answers "What are the neighbors of this station?" in O(1) time complexity.
//   - Set: Prevents adding the same neighbor twice (two lines might share the same segment).
//
// Why undirected?
//   The metro operates bidirectionally: if you can go from A→B, you can also go from B→A.
//   add(a, b) implies both "b is a neighbor of a" and "a is a neighbor of b".

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


// ─────────────────────────────────────────────────────────────────────────────
// 2) shortestDistances — Shortest distances via BFS
// ─────────────────────────────────────────────────────────────────────────────
 
// Computes the shortest distance from the `src` station to all reachable stations 
// in the network in terms of the NUMBER OF SEGMENTS.
// Returns: Map<stationId, distance>
//
// Why BFS (Breadth-First Search)?
//   BFS guarantees the shortest path in unweighted graphs.
//   Since edge weights are equal (each segment = 1 step), BFS is sufficient;
//   there is no need for more complex algorithms like Dijkstra's.
//
// How it works:
//   A queue is maintained. The starting station is added to the queue with a distance of 0.
//   At each step, a station is dequeued and its neighbors are checked.
//   Unvisited neighbors (dist.has(v) == false) are added to the queue,
//   and their distances are recorded as "parent's distance + 1".
//   This ensures that every station is visited via the shortest path possible.

export function shortestDistances(adj, src) {
  const dist = new Map([[src, 0]]);  // distance from src to itself is 0
  const queue = [src];
  while (queue.length) {
    const u = queue.shift();  // take the first station from the queue
    for (const v of adj.get(u) || []) { // for each neighbor of u
      if (!dist.has(v)) {  // if v hasn't been visited yet
        dist.set(v, dist.get(u) + 1); // record the distance to v
        queue.push(v); // add v to the queue for further exploration
      }
    }
  }
  return dist;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) chooseStartAndDest — Select random start/destination pair
// ─────────────────────────────────────────────────────────────────────────────
 
// Spec: "start and destination stations must be at least 3 segments apart"
// This function selects a random pair whose shortest path distance is >= minDistance.
//
// Algorithm:
//   1) Shuffle all station IDs (random order).
//   2) Test each candidate as a starting point → compute all distances using BFS.
//   3) Stations with a distance >= minDistance become the "candidate destinations" list.
//   4) Select a random destination from this list → return the pair.
//   5) If no valid pair is found for any start station, throw an error 
//      (our network has 102 valid pairs, so this shouldn't happen).
//
// Why do we shuffle?
//   If we didn't shuffle, every game would start with the same pair (the first valid pair in ID order).
//   sort(() => Math.random() - 0.5) provides a quick shuffle similar to Fisher-Yates.

// Pick a random start and a random destination with shortest distance >= minDistance.
export function chooseStartAndDest(stations, lines, minDistance = 3) {
  const adj = buildAdjacency(lines);
  const ids = stations.map((s) => s.id);
  const shuffled = [...ids].sort(() => Math.random() - 0.5); // copy it to avoid mutating the original array
  for (const startId of shuffled) {
    const dist = shortestDistances(adj, startId);
    const candidates = [...dist.entries()]
      .filter(([, d]) => d >= minDistance)  // at least 3 segments away
      .map(([id]) => id);
    if (candidates.length > 0) {
      const destId = candidates[Math.floor(Math.random() * candidates.length)];
      return { startId, destId };
    }
  }
  throw new Error('No valid start/destination pair found.');
}


// ─────────────────────────────────────────────────────────────────────────────
// 4) listSegments — Unique Network Segments List
// ─────────────────────────────────────────────────────────────────────────────
 
// Produces the complete list of connections for the player's planning phase.
// Returns each segment as { a, b } where 'a' is strictly less than 'b' (a < b).
//
// Rationale for a < b sorting:
//   Undirected segments (e.g., 2↔6 and 6↔2) are identical.
//   Enforcing a min(a,b) to max(a,b) normalization ensures unique storage in the Set.
//
// Purpose of the Set:
//   If distinct lines (e.g., M1 and M3) share a segment like Mecidiyeköy↔Yenikapı (2↔6),
//   the Set deduplicates it, rendering the connection exactly ONCE.

// All distinct undirected segments as { a, b } with a < b (the planning list).
export function listSegments(lines) {
  const set = new Set();
  for (const line of lines) {
    const seq = line.stations;
    for (let i = 0; i + 1 < seq.length; i++) {
      const a = Math.min(seq[i], seq[i + 1]);  // // normalize: smaller ID first
      const b = Math.max(seq[i], seq[i + 1]);
      set.add(`${a}-${b}`);   // string key preserves uniqueness in the Set
    }
  }
  // Convert the strings back to { a, b } objects
  return [...set].map((key) => {
    const [a, b] = key.split('-').map(Number);
    return { a, b };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) validateRoute — Route validation (server authority)
// ─────────────────────────────────────────────────────────────────────────────
 
// Is the route submitted by the player valid?
// Parameter: routePairs = [[fromId, toId], [fromId, toId], ...]
//
// Valid route conditions (ALL must be met):
//   1) Not empty
//   2) Every segment is a real network edge (exists in the adjacency list)
//   3) Consecutive segments are connected (contiguous walk):
//      The "destination" station of the previous segment = the "origin" station of the next
//   4) No segment can be used twice (undirected: a↔b and b↔a are the same segment)
//   5) Final station = destId
//
// Why aren't we using BFS for validation?
//   The player is already providing a specific path; we don't need BFS to answer
//   "is this path valid?". We can check it in a single pass (O(n)).
//
// Why isn't the "line transfer only at interchanges" rule explicitly checked?
//   Because it is inherently satisfied: switching between two different lines is only
//   possible at a station where both lines pass.
//   Any contiguous walk composed of real network edges satisfies this rule automatically.

export function validateRoute(routePairs, startId, destId, adj) {
  if (!Array.isArray(routePairs) || routePairs.length === 0) {
    return { valid: false, reason: 'empty' };
  }
  const usedKeys = new Set();  // to track used segments (undirected)
  let current = startId;       // the station we are currently at.
  for (const pair of routePairs) {
    if (!Array.isArray(pair) || pair.length !== 2) return { valid: false, reason: 'malformed' };
    const a = Number(pair[0]);  
    const b = Number(pair[1]);
    
    // Condition 3: Connected walking — the segment must start from the current position.
    let next;
    if (a === current) next = b;  
    else if (b === current) next = a; 
    else return { valid: false, reason: 'not-contiguous' };
    
    // Condition 2: The segment must exist in the network (adjacency list).
    if (!adj.has(a) || !adj.get(a).has(b)) return { valid: false, reason: 'no-such-segment' };
    
    // Condition 4: No segment can be used twice.
    // Normalize: a < b, so 2↔6 and 6↔2 are the same key
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (usedKeys.has(key)) return { valid: false, reason: 'repeated-segment' };
    usedKeys.add(key);
    current = next; // next segment should start from here
  }
  
  // Condition 5: The final station must be the destination.
  if (current !== destId) return { valid: false, reason: 'wrong-destination' };
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) executeRoute — Execute the route and apply random events
// ─────────────────────────────────────────────────────────────────────────────
 
// Applies a random event to each segment of a valid route and computes the running coin total.
//
// Parameters:
//   route      — [{ from:{id,name}, to:{id,name} }, ...] (guaranteed to be a valid route)
//   startCoins — initial coin amount (fixed at 20 — STARTING_COINS)
//   events     — array of all events fetched from the DB
//   rng        — random number generator function; defaults to Math.random
//
// Why is there an rng parameter?
//   Testability: passing a mock like rng = 0 yields the exact same event every time,
//   enabling deterministic unit tests. In production, Math.random() is used.
//
// Coin logic:
//   - Coins can drop below zero mid-route (displayed on screen, allowing the player to see their "debt").
//   - The final score cannot fall below 0: Math.max(0, coins).
//   - This provides a "you can recover from a deficit" gameplay experience, but the final score is never negative.

export function executeRoute(route, startCoins, events, rng = Math.random) {
  let coins = startCoins;
  const steps = route.map((seg) => {
    // choose a random event.
    const event = events[Math.floor(rng() * events.length)];
    coins += event.effect; // update the coin total (can go negative mid-route)
    return {
      from: seg.from,
      to: seg.to,
      event: { description: event.description, effect: event.effect },
      coins,  // running total after this segment (can be negative)
    };
  });
  return { steps, finalScore: Math.max(0, coins) }; // final score cannot be negative
}