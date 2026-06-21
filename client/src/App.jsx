import { useEffect, useState } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';

import API from './API.js';
import AuthContext from './contexts/AuthContext.js';
import NavHeader from './components/NavHeader.jsx';
import LoginForm from './components/LoginForm.jsx';
import HomePage from './pages/HomePage.jsx';
import GamePage from './pages/GamePage.jsx';
import RankingPage from './pages/RankingPage.jsx';
import NotFound from './pages/NotFound.jsx';

// Layout shared by every route: the nav bar plus the active page.
function Layout() {
  return (
    <>
      <NavHeader />
      <Container className="py-4">
        <Outlet />
      </Container>
    </>
  );
}

function App() {
  // user state lives here and is passed down via AuthContext.Provider.
  const [user, setUser] = useState(null);        // null = anonymous
  const [authLoading, setAuthLoading] = useState(true);

  // On startup, ask the server whether there is an active session.
  // The ignore flag prevents a stale setState in React StrictMode (effects run twice in dev).
  useEffect(() => {
    API.getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const login = async (username, password) => {
    const u = await API.login(username, password);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await API.logout();
    setUser(null);
  };

  // Avoid flashing the logged-out UI before the session check completes.
  if (authLoading) return null;

  return (
    // Provide user + setter to every component in the tree.
    <AuthContext.Provider value={{ user, login, logout }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={user ? <Navigate replace to="/" /> : <LoginForm />}
          />
          {/* /game is the full game flow (setup→planning→execution→result) in one route. */}
          {/*  No reload between phases — phase state lives in GamePage.*/}
          <Route path="/game" element={<GamePage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="*" element={<NotFound />} />  {/* Catch-all: any unknown path shows NotFound.*/}
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;