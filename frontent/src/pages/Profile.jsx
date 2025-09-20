import axios from 'axios';
import { useEffect, useState } from 'react';

export default function Profile({ user, setUser, token }) {
  const [username, setUsername] = useState(user?.username || '');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user]);

  const save = async () => {
    if (!username.trim()) {
      alert('Username cannot be empty');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.put(
        `https://open-talk-1.onrender.com/profile/update/${user.id}`,
        { username },
        { headers: { Authorization: token } }
      );
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      alert('Updated Successfully');
      setEditMode(false);
    } catch (e) {
      alert('Error updating username');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Profile</h2>

      <div style={styles.card}>
        <label style={styles.label}>Username:</label>

        {editMode ? (
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
            <button style={styles.saveBtn} onClick={save} disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button style={styles.cancelBtn} onClick={() => setEditMode(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <div style={styles.displayGroup}>
            <span style={styles.username}>{username}</span>
            <button style={styles.updateBtn} onClick={() => setEditMode(true)}>
              Update
            </button>
          </div>
        )}
      </div>

      <div style={styles.card}>
        <p>
          <strong>Your ID:</strong> {user?.id}
        </p>
      </div>
    </div>
  );
}

// Inline styles for simplicity
const styles = {
  container: {
    maxWidth: 500,
    margin: '20px auto',
    padding: 20,
    fontFamily: 'Arial, sans-serif',
  },
  heading: {
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginBottom: 8,
  },
  displayGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: 500,
  },
  updateBtn: {
    padding: '6px 12px',
    border: 'none',
    backgroundColor: '#007BFF',
    color: '#fff',
    borderRadius: 5,
    cursor: 'pointer',
  },
  inputGroup: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: 8,
    borderRadius: 5,
    border: '1px solid #ccc',
    fontSize: 16,
  },
  saveBtn: {
    padding: '6px 12px',
    border: 'none',
    backgroundColor: '#28a745',
    color: '#fff',
    borderRadius: 5,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 12px',
    border: 'none',
    backgroundColor: '#dc3545',
    color: '#fff',
    borderRadius: 5,
    cursor: 'pointer',
  },
};
