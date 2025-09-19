import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ afterLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!username || !password) {
      alert('Please fill both fields');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('https://open-talk-1.onrender.com/auth/login', { username, password });
      afterLogin(res.data);
    } catch (e) {
      alert(e.response?.data?.msg || 'Error');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Login</h2>
      <input
        style={styles.input}
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button style={styles.button} onClick={login} disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 400,
    margin: '50px auto',
    padding: 20,
    borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    marginBottom: 20,
    color: '#007BFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 15,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 16,
  },
  button: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#28a745',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: '0.2s',
  },
};
