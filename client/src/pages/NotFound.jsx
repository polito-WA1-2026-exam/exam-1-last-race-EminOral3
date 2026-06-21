import { Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';

// A single line of catch-all code. In App.jsx, this is displayed on any 
// unrecognized URL that is linked to the path="*" route.

function NotFound() {
  return (
    <Alert variant="warning">
      Page not found. <Link to="/">Go back home</Link>.
    </Alert>
  );
}

export default NotFound;