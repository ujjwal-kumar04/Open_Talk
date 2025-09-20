
import { useEffect, useRef, useState } from 'react';
import socket from '../socket';

let pc;
let localStream;
let remoteStream;
let iceQueue = []; // queue ICE candidates until remoteDescription set

export default function Call1({ user, setPage, roomInfo }) {
  const localVideo = useRef();
  const remoteVideo = useRef();

  const [inCall, setInCall] = useState(false);
  const [partner, setPartner] = useState(roomInfo?.partner || null);
  const [roomId, setRoomId] = useState(roomInfo?.roomId || null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    socket.emit('iamonline', { userId: user.id });

    // If we already have roomInfo, start peer connection
    if (roomId && partner) {
      startPeer(roomId, true);
    }

    // matched event triggers peer start
    const onMatched = ({ roomId: newRoomId, partner: newPartner }) => {
      console.log('Matched event received:', { roomId: newRoomId, partner: newPartner });
      setRoomId(newRoomId);
      setPartner(newPartner);
      startPeer(newRoomId, true);
    };

    const onOffer = async ({ offer, from }) => {
      console.log('Received offer from:', from, 'Current roomId:', roomId);
      if (!pc) {
        // If we don't have a peer connection yet, we're the receiver
        console.log('Creating peer connection as receiver');
        await startPeer(roomId || roomInfo?.roomId, false);
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('Set remote description successfully');
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Created and set local answer');
        
        socket.emit('answer', { roomId: roomId || roomInfo?.roomId, answer });

        // add any queued ICE candidates
        iceQueue.forEach(async candidate => {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (e) { console.error('Failed to add queued candidate', e); }
        });
        iceQueue = [];
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const onAnswer = async ({ answer, from }) => {
      console.log('Received answer from:', from);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log('Set remote answer successfully');
        } catch (err) {
          console.error('Error setting remote answer:', err);
        }
      } else {
        console.log('PC not ready or already stable');
      }
    };

    const onIceCandidate = async ({ candidate, from }) => {
      console.log('Received ICE candidate from:', from);
      if (!candidate) return;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate', e);
        }
      } else {
        iceQueue.push(candidate);
      }
    };

    socket.on('matched', onMatched);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);

    return () => {
      if (pc) pc.close();
      pc = null;
      iceQueue = [];
      socket.off('matched', onMatched);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
      window.onbeforeunload = null;
    };
  }, [user.id, roomId]); // Add roomId dependency

  const startPeer = async (rId, initiator = true) => {
    // Add STUN servers for better connectivity
    pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });
    setInCall(true);

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log('Local stream acquired:', localStream.getTracks().map(t => t.kind));
    } catch (err) {
      console.error('getUserMedia failed', err);
      setInCall(false);
      return;
    }

    if (localVideo.current) localVideo.current.srcObject = localStream;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {
      console.log('Received remote track:', e.track.kind);
      console.log('Remote streams:', e.streams);
      console.log('Track readyState:', e.track.readyState);
      
      if (e.streams && e.streams[0]) {
        remoteStream = e.streams[0];
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = remoteStream;
          console.log('Remote video set successfully');
          
          // Force play the remote video
          remoteVideo.current.play().catch(err => {
            console.error('Error playing remote video:', err);
          });
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId: rId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.log('ICE connection failed, trying to restart');
        pc.restartIce();
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
    };

    if (initiator) {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);
      console.log('Created and set local offer');
      socket.emit('offer', { roomId: rId, offer });
    }

    window.onbeforeunload = () => {
      leave();
    };
  };

  const leave = () => {
    if (pc) pc.close();
    pc = null;
    iceQueue = [];
    if (roomId) socket.emit('leave', { userId: user.id, roomId });
    setInCall(false);
    setPartner(null);
    setRoomId(null);
    window.onbeforeunload = null;
    if (setPage) setPage('profile');
  };

  const next = () => {
    leave();
    if (setPage) setPage('connect');
  };

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
    setIsVideoOff(prev => !prev);
  };

  const checkConnections = () => {
    console.log('=== Connection Debug Info ===');
    console.log('Room ID:', roomId);
    console.log('Partner:', partner);
    console.log('PC exists:', !!pc);
    console.log('PC state:', pc?.connectionState);
    console.log('ICE state:', pc?.iceConnectionState);
    console.log('Signaling state:', pc?.signalingState);
    console.log('Local stream:', !!localStream);
    console.log('Remote stream:', !!remoteStream);
    console.log('Local video srcObject:', !!localVideo.current?.srcObject);
    console.log('Remote video srcObject:', !!remoteVideo.current?.srcObject);
    console.log('ICE queue length:', iceQueue.length);
  };

  const restartConnection = async () => {
    console.log('Manually restarting entire connection...');
    
    // Clean up existing connection
    if (pc) {
      pc.close();
      pc = null;
    }
    iceQueue = [];
    
    // Restart peer connection
    if (roomId && partner) {
      console.log('Restarting peer connection...');
      await startPeer(roomId, true);
    } else {
      console.log('No room or partner info available for restart');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Video Call</h2>
      {partner && <p style={styles.partner}>Partner: {partner.username}</p>}
      
      {!partner && !roomId && (
        <div>
          <p style={styles.status}>No partner found. Please go back to connect.</p>
          <button style={styles.disconnectBtn} onClick={() => setPage('connect')}>
            Back to Connect
          </button>
        </div>
      )}

      {(partner && roomId) && (
        <>
          <div style={styles.videoContainer}>
            <video 
              ref={localVideo} 
              autoPlay 
              muted 
              playsInline 
              style={styles.videoBox}
              onLoadedMetadata={() => console.log('Local video metadata loaded')}
            />
            <video 
              ref={remoteVideo} 
              autoPlay 
              playsInline 
              style={styles.videoBox}
              onLoadedMetadata={() => console.log('Remote video metadata loaded')}
              onCanPlay={() => console.log('Remote video can play')}
            />
          </div>

          {!inCall && <p style={styles.status}>Waiting to join call...</p>}

          {inCall && (
            <div style={styles.buttonGroup}>
              <button style={styles.disconnectBtn} onClick={leave}>Disconnect</button>
              <button style={styles.nextBtn} onClick={next}>Next</button>
              <button style={styles.restartBtn} onClick={restartConnection}>Restart Connection</button>
              <button style={styles.debugBtn} onClick={checkConnections}>Debug Info</button>
              <button
                style={{ ...styles.circleBtn, backgroundColor: isMuted ? '#dc3545' : '#007BFF' }}
                onClick={toggleMute}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                style={{ ...styles.circleBtn, backgroundColor: isVideoOff ? '#dc3545' : '#28a745' }}
                onClick={toggleVideo}
              >
                {isVideoOff ? 'Video On' : 'Video Off'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 900,
    margin: '30px auto',
    padding: 20,
    borderRadius: 10,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  title: { color: '#007BFF', fontSize: 28, marginBottom: 10 },
  partner: { fontSize: 18, marginBottom: 15 },
  videoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap',
  },
  videoBox: { width: '400px', height: '300px', borderRadius: 8, background: '#000', objectFit: 'cover' },
  status: { marginTop: 15, fontSize: 16 },
  buttonGroup: { marginTop: 20, display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap' },
  disconnectBtn: { padding: '10px 25px', fontSize: 16, backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  nextBtn: { padding: '10px 25px', fontSize: 16, backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  restartBtn: { padding: '10px 25px', fontSize: 16, backgroundColor: '#ffc107', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer' },
  debugBtn: { padding: '10px 25px', fontSize: 16, backgroundColor: '#6f42c1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  circleBtn: { width: 60, height: 60, borderRadius: '50%', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' },
};


