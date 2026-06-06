import { useEffect, useState } from 'react';
import API from './API.js';

function App() {
  const [message, setMessage] = useState('Connecting to the server...');

  useEffect(() => {
    API.getHello()
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('Could not reach the server. Is it running on port 3001?'));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Last Race</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
