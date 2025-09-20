import { useEffect, useState } from 'react';
import Call1 from './pages/Call1';
import Connect from './pages/Connect';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';

function App() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('token') || null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  });
  const [page, setPage] = useState('login');
  const [roomInfo, setRoomInfo] = useState({ roomId: null, partner: null });

  useEffect(() => {
    if (token && user) setPage('profile');
  }, [token, user]);

  const handleLogin = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    setPage('profile');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setPage('login');
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.logo}>OpenTalk - Voice</h1>
        <div style={styles.nav}>
          {token ? (
            <>
              <span style={styles.username}>{user?.username}</span>
              <button style={styles.btn} onClick={() => setPage('profile')}>Profile</button>
              <button style={styles.btn} onClick={() => setPage('connect')}>Connect</button>
              <button style={{ ...styles.btn, backgroundColor: '#dc3545' }} onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button style={styles.btn} onClick={() => setPage('login')}>Login</button>
              <button style={styles.btn} onClick={() => setPage('register')}>Register</button>
            </>
          )}
        </div>
      </header>

      {/* Page content */}
      <main style={{ padding: 20 }}>
        {page === 'register' && <Register afterRegister={handleLogin} />}
        {page === 'login' && <Login afterLogin={handleLogin} />}
        {page === 'profile' && <Profile user={user} setUser={setUser} token={token} />}
        {page === 'connect' && (
          <Connect user={user} token={token} setPage={setPage} setRoomInfo={setRoomInfo} />
        )}
        {page === 'call' && <Call1 user={user} roomInfo={roomInfo} setPage={setPage} />}
      </main>
    </div>
  );
}

export default App;

// ---- Styles ----
const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 20px',
    backgroundColor: '#007BFF',
    color: '#fff',
    flexWrap: 'wrap',
  },
  logo: {
    margin: 0,
    fontSize: 24,
    fontWeight: 'bold',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  username: {
    fontWeight: 600,
    marginRight: 10,
  },
  btn: {
    padding: '6px 14px',
    border: 'none',
    borderRadius: 5,
    backgroundColor: '#28a745',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 500,
    transition: '0.2s',
  },
};
