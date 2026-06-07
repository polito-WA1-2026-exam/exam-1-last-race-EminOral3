import { Row, Col, Card, Badge, ListGroup } from 'react-bootstrap';
import NetworkMap from './NetworkMap.jsx';

function PlanningPhase({ game }) {
  const { start, destination, stations, segments } = game;

  return (
    <div>
      <h2 className="mb-3">Planning</h2>
      <p>
        Build a route from <Badge bg="success">{start.name}</Badge> to{' '}
        <Badge bg="danger">{destination.name}</Badge>.
      </p>
      <Row>
        <Col md={7}>
          <NetworkMap
            stations={stations}
            lines={[]}
            showLines={false}
            startId={start.id}
            destId={destination.id}
          />
        </Col>
        <Col md={5}>
          <Card>
            <Card.Header>Connections ({segments.length})</Card.Header>
            <ListGroup variant="flush" style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {segments.map((seg) => (
                <ListGroup.Item key={`${seg.from.id}-${seg.to.id}`}>
                  {seg.from.name} — {seg.to.name}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>
      </Row>
      <p className="text-muted mt-3">
        (Route building and the 90-second timer come in the next phase.)
      </p>
    </div>
  );
}

export default PlanningPhase;