import { useContext } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext.js';

function NavHeader() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

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