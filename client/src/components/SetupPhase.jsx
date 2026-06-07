import { Button, Alert } from 'react-bootstrap';
import NetworkMap from './NetworkMap.jsx';

function SetupPhase({ network, onReady, starting, error }) {
  return (
    <div>
      <h2 className="mb-3">Setup — study the map</h2>
      <p className="text-muted">
        Memorise the lines and interchanges. In the planning phase the lines
        vanish and you must rebuild a route from the list of connections within
        90 seconds.
      </p>
      <NetworkMap stations={network.stations} lines={network.lines} showLines />
      {error && <Alert variant="danger">{error}</Alert>}
      <Button size="lg" onClick={onReady} disabled={starting}>
        {starting ? 'Starting...' : "I'm ready — start planning"}
      </Button>
    </div>
  );
}

export default SetupPhase;