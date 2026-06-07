import { Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <Alert variant="warning">
      Page not found. <Link to="/">Go back home</Link>.
    </Alert>
  );
}

export default NotFound;