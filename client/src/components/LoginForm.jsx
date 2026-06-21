import { useContext, useState } from 'react';
import { Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext.js';

function LoginForm() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Controlled form submit: preventDefault stops the browser's default page reload.
  // Client-side check runs before the network call to avoid a wasted request.
  const handleSubmit = async (event) => {
    event.preventDefault(); //The natural behavior of an HTML form is to refresh the page; this needs to be stopped
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    try {
      // login() calls POST /api/sessions and updates AuthContext on success.
      // On failure it throws, caught below and shown as an error message.
      await login(username.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card style={{ maxWidth: '420px', margin: '0 auto' }}>
      <Card.Body>
        <Card.Title className="mb-3">Login</Card.Title>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="login-username">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              autoFocus
              onChange={(e) => setUsername(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="login-password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Form.Group>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default LoginForm;