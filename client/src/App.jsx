import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchApi } from './utils/api';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import FormBuilder from './pages/FormBuilder';
import FormResponder from './pages/FormResponder';
import FormResults from './pages/FormResults';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetchApi('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetchApi('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="app-container">Loading...</div>;

  return (
    <Router>
      <div className="navbar">
        <Link to="/" className="nav-brand">myForm</Link>
        <div className="nav-links">
          {user ? (
            <>
              <span>Hello, {user.username}</span>
              <button onClick={handleLogout} className="btn btn-secondary">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary">Login</Link>
              <Link to="/register" className="btn btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>

      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forms/:id/edit" element={<FormBuilder user={user} />} />
          <Route path="/forms/:id/results" element={<FormResults user={user} />} />
          <Route path="/forms/:id" element={<FormResponder user={user} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
