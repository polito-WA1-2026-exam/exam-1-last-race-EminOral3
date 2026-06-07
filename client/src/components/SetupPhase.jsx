import { Button } from 'react-bootstrap';
import NetworkMap from './NetworkMap.jsx';

// First game phase: the player studies the full network before planning.
function SetupPhase({ network, onReady }) {
  return (
    <div>
      <h2 className="mb-3">Setup — study the map</h2>
      <p className="text-muted">
        Memorise the lines and interchanges. In the planning phase the lines
        vanish and you must rebuild a route from the list of connections within
        90 seconds.
      </p>
      <NetworkMap stations={network.stations} lines={network.lines} showLines />
      <Button size="lg" onClick={onReady}>I&apos;m ready — start planning</Button>
    </div>
  );
}

export default SetupPhase;