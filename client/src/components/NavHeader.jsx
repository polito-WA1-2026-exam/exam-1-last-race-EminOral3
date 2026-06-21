import { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext.js';

// The navigation bar at the top of the page reads the user from the AuthContext and displays different links depending on 
// whether the user is logged in or not: Play + Ranking + Logout if logged in, and just the Login button if logged out. 
// It hides the Login button on the login page using `useLocation` (to avoid unnecessary repetition).

function NavHeader() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // In the NavBar (NavHeader.jsx), only the "Login" button is visible. 
  // The "Play" and "Ranking" links are hidden by the {user && ...} code — 
  // they are not shown because user is null. If you try to go to /game or /ranking, 
  // the <Navigate replace to="/login" /> command will be activated and you will be redirected to the login page.

  return (
    <Navbar bg="dark" variant="dark" expand="md">
      <Container>
        <Navbar.Brand as={Link} to="/">Last Race</Navbar.Brand>
        <Nav className="me-auto">
          <Nav.Link as={Link} to="/">Instructions</Nav.Link>
          {user && <Nav.Link as={Link} to="/game">Play</Nav.Link>}
          {user && <Nav.Link as={Link} to="/ranking">Ranking</Nav.Link>}
        </Nav>
        <Nav>
          {user ? (
            <div className="d-flex align-items-center gap-3">
              <span className="text-light">Hi, {user.name}</span>
              <Button variant="outline-light" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            location.pathname !== '/login' && (
              <Button variant="outline-light" size="sm" as={Link} to="/login">
                Login
              </Button>
            )
          )}
        </Nav>
      </Container>
    </Navbar>
  );
}

export default NavHeader;