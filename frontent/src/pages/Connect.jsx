import { useEffect, useState } from 'react';
import socket from '../socket';

export default function Connect({ user, token, setPage, setRoomInfo }) {
  const [status, setStatus] = useState('idle');
  const [partner, setPartner] = useState(null);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    socket.emit('iamonline', { userId: user.id });

    const onWaiting = () => setStatus('waiting');
    const onMatched = ({ roomId, partner }) => {
      setStatus('matched');
      setPartner(partner);
      setRoomId(roomId);
      setRoomInfo({ roomId, partner });

      // Only redirect to call page when actually matched with partner
      if (partner && roomId) {
        setTimeout(() => setPage('call'), 500);
      }
    };

    socket.on('waiting', onWaiting);
    socket.on('matched', onMatched);

    return () => {
      socket.off('waiting', onWaiting);
      socket.off('matched', onMatched);
    };
  }, []);

  const start = () => {
    setStatus('searching');
    socket.emit('findPartner', { userId: user.id });
  };

  const stop = () => {
    if (roomId) socket.emit('leave', { userId: user.id, roomId });
    setStatus('idle');
    setPartner(null);
    setRoomId(null);
  };

  // Remove auto-start - let user manually start
  // useEffect(() => {
  //   if (status === 'idle') {
  //     start(); // automatically search start kare
  //   }
  // }, [status]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Connect</h2>
      <p style={styles.status}><strong>Status:</strong> {status}</p>

      {status === 'idle' && (
        <button style={styles.button} onClick={start}>Start Searching</button>
      )}

      {(status === 'waiting' || status === 'searching') && (
        <button style={{ ...styles.button, backgroundColor: '#dc3545' }} onClick={stop}>Cancel</button>
      )}

      {status === 'matched' && partner && (
        <div style={styles.matchedBox}>
          <h3>Connected with {partner.username}</h3>
          <p>Room ID: {roomId}</p>
          <p>Redirecting to Call...</p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 500,
    margin: '50px auto',
    padding: 20,
    borderRadius: 10,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    color: '#007BFF',
    fontSize: 28,
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    padding: '10px 20px',
    margin: '10px 0',
    borderRadius: 6,
    border: 'none',
    backgroundColor: '#007BFF',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    transition: '0.2s',
  },
  matchedBox: {
    marginTop: 20,
    textAlign: 'center',
    width: '100%',
    border: '1px solid #ddd',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
};
