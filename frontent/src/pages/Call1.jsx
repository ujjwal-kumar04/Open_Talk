
import { useEffect, useRef, useState } from 'react';
import socket from '../socket';

let pc;
let localStream;
let remoteStream;
let iceQueue = [];

export default function Call1({ user, setPage, roomInfo }) {
  const localVideo = useRef();
  const remoteVideo = useRef();

  const [inCall, setInCall] = useState(false);
  const [partner, setPartner] = useState(roomInfo?.partner || null);
  const [roomId, setRoomId] = useState(roomInfo?.roomId || null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    socket.emit('iamonline', { userId: user.id });

    if (roomId && partner) {
      startPeer(roomId, true);
    }

    const onMatched = ({ roomId: newRoomId, partner: newPartner }) => {
      setRoomId(newRoomId);
      setPartner(newPartner);
      startPeer(newRoomId, true);
    };

    const onOffer = async ({ offer, from }) => {
      const currentRoomId = roomId || roomInfo?.roomId;
      if (!currentRoomId) return;
      
      if (!pc) {
        await startPeer(currentRoomId, false);
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId: currentRoomId, answer });

        if (iceQueue.length > 0) {
          iceQueue.forEach(async candidate => {
            try { 
              await pc.addIceCandidate(new RTCIceCandidate(candidate)); 
            }
            catch (e) { console.error('Failed to add queued candidate', e); }
          });
          iceQueue = [];
        }
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const onAnswer = async ({ answer, from }) => {
      if (!pc || pc.signalingState !== 'have-local-offer') {
        return;
      }
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        if (iceQueue.length > 0) {
          iceQueue.forEach(async candidate => {
            try { 
              await pc.addIceCandidate(new RTCIceCandidate(candidate)); 
            }
            catch (e) { console.error('Failed to add queued candidate after answer', e); }
          });
          iceQueue = [];
        }
      } catch (err) {
        console.error('Error setting remote answer:', err);
      }
    };

    const onIceCandidate = async ({ candidate, from }) => {
      if (!candidate) return;
      
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      } else {
        iceQueue.push(candidate);
      }
    };

    const onUserLeft = ({ userId }) => {
      if (pc) {
        pc.close();
        pc = null;
      }
      iceQueue = [];
      setInCall(false);
      setPartner(null);
      setRoomId(null);
      alert('Your partner left the call');
      setPage('connect');
    };

    socket.on('matched', onMatched);
    socket.on('offer', onOffer);
    socket.on('answer', onAnswer);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('user-left', onUserLeft);

    return () => {
      if (pc) pc.close();
      pc = null;
      iceQueue = [];
      socket.off('matched', onMatched);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('user-left', onUserLeft);
      window.onbeforeunload = null;
    };
  }, [user.id, roomId]);

  const startPeer = async (rId, initiator = true) => {
    pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });
    setInCall(true);

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.error('getUserMedia failed', err);
      setInCall(false);
      return;
    }

    if (localVideo.current) localVideo.current.srcObject = localStream;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (e) => {      
      if (e.streams && e.streams[0]) {
        remoteStream = e.streams[0];
        
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = remoteStream;
          
          remoteVideo.current.onloadedmetadata = () => {
            remoteVideo.current.play().catch(err => {
              console.error('Error playing remote video:', err);
            });
          };
        }
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId: rId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        console.log('ICE connection established successfully');
      }
      
      if (pc.iceConnectionState === 'failed') {
        setTimeout(() => restartConnection(), 1000);
      }
      
      if (pc.iceConnectionState === 'disconnected') {
        setTimeout(() => restartConnection(), 1000);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setTimeout(() => {
          if (!remoteVideo.current?.srcObject || remoteVideo.current?.videoWidth === 0) {
            restartConnection();
          }
        }, 1500);
      }
    };

    if (initiator) {
      setTimeout(async () => {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
          });
          await pc.setLocalDescription(offer);
          socket.emit('offer', { roomId: rId, offer });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      }, 500);
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
    setPage('profile');
  };

  const next = () => {
    leave();
    setPage('connect');
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

  const restartConnection = async () => {
    if (pc) {
      pc.close();
      pc = null;
    }
    iceQueue = [];
    
    if (roomId && partner) {
      await startPeer(roomId, true);
    }
  };

  return (
    <div style={{
      ...styles.container,
      margin: isMobile ? '10px' : '20px auto',
      padding: isMobile ? '15px' : '25px',
    }}>
      <div style={styles.header}>
        <h1 style={{
          ...styles.title,
          fontSize: isMobile ? '24px' : '32px',
        }}>🎥 Video Call</h1>
        {partner && (
          <div style={styles.partnerInfo}>
            <div style={styles.partnerAvatar}>
              {partner.username.charAt(0).toUpperCase()}
            </div>
            <p style={{
              ...styles.partnerName,
              fontSize: isMobile ? '16px' : '18px',
            }}>
              Connected with <strong>{partner.username}</strong>
            </p>
          </div>
        )}
      </div>
      
      {!partner && !roomId && (
        <div style={styles.noPartnerContainer}>
          <div style={styles.noPartnerIcon}>🔍</div>
          <p style={styles.noPartnerText}>No partner found</p>
          <button 
            style={{
              ...styles.primaryBtn,
              padding: isMobile ? '12px 24px' : '14px 28px',
            }} 
            onClick={() => setPage('connect')}
          >
            🔄 Back to Connect
          </button>
        </div>
      )}

      {(partner && roomId) && (
        <>
          <div style={{
            ...styles.videoContainer,
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '15px' : '20px',
          }}>
            <div style={styles.videoWrapper}>
              <video 
                ref={localVideo} 
                autoPlay 
                muted 
                playsInline 
                style={{
                  ...styles.videoBox,
                  width: isMobile ? '100%' : '350px',
                  height: isMobile ? '220px' : '280px',
                }}
              />
              <div style={styles.videoLabel}>
                <span style={styles.videoLabelText}>You</span>
              </div>
            </div>
            
            <div style={styles.videoWrapper}>
              <video 
                ref={remoteVideo} 
                autoPlay 
                playsInline 
                style={{
                  ...styles.videoBox,
                  width: isMobile ? '100%' : '350px',
                  height: isMobile ? '220px' : '280px',
                }}
              />
              <div style={styles.videoLabel}>
                <span style={styles.videoLabelText}>{partner.username}</span>
              </div>
            </div>
          </div>

          {!inCall && (
            <div style={styles.connectingContainer}>
              <div style={styles.loader}></div>
              <p style={{
                ...styles.connectingText,
                fontSize: isMobile ? '14px' : '16px',
              }}>
                🔄 Connecting to call...
              </p>
            </div>
          )}

          {inCall && (
            <div style={{
              ...styles.controlsContainer,
              gap: isMobile ? '12px' : '16px',
              marginTop: isMobile ? '20px' : '25px',
            }}>
              <button 
                style={{
                  ...styles.actionBtn,
                  ...styles.disconnectBtn,
                  padding: isMobile ? '10px 20px' : '12px 24px',
                  fontSize: isMobile ? '14px' : '16px',
                }} 
                onClick={leave}
              >
                📞 End Call
              </button>
              
              <button 
                style={{
                  ...styles.actionBtn,
                  ...styles.nextBtn,
                  padding: isMobile ? '10px 20px' : '12px 24px',
                  fontSize: isMobile ? '14px' : '16px',
                }} 
                onClick={next}
              >
                ⏭️ Next
              </button>
              
              <button
                style={{
                  ...styles.circleBtn,
                  width: isMobile ? '50px' : '60px',
                  height: isMobile ? '50px' : '60px',
                  fontSize: isMobile ? '18px' : '20px',
                  backgroundColor: isMuted ? '#e74c3c' : '#3498db',
                  boxShadow: isMuted ? '0 4px 15px rgba(231, 76, 60, 0.3)' : '0 4px 15px rgba(52, 152, 219, 0.3)',
                }}
                onClick={toggleMute}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>
              
              <button
                style={{
                  ...styles.circleBtn,
                  width: isMobile ? '50px' : '60px',
                  height: isMobile ? '50px' : '60px',
                  fontSize: isMobile ? '18px' : '20px',
                  backgroundColor: isVideoOff ? '#e74c3c' : '#27ae60',
                  boxShadow: isVideoOff ? '0 4px 15px rgba(231, 76, 60, 0.3)' : '0 4px 15px rgba(39, 174, 96, 0.3)',
                }}
                onClick={toggleVideo}
              >
                {isVideoOff ? '📹' : '🎥'}
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
    maxWidth: '1000px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    color: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    textAlign: 'center',
    marginBottom: '25px',
  },
  title: {
    background: 'linear-gradient(45deg, #fff, #f8f9fa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 'bold',
    margin: '0 0 15px 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  partnerInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '15px',
    padding: '10px 20px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  partnerAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    color: '#667eea',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
  },
  partnerName: {
    margin: 0,
    color: '#fff',
  },
  noPartnerContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  noPartnerIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  noPartnerText: {
    fontSize: '18px',
    marginBottom: '25px',
    opacity: 0.9,
  },
  videoContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  videoWrapper: {
    position: 'relative',
    borderRadius: '15px',
    overflow: 'hidden',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    border: '3px solid rgba(255,255,255,0.2)',
  },
  videoBox: {
    borderRadius: '15px',
    backgroundColor: '#000',
    objectFit: 'cover',
    display: 'block',
  },
  videoLabel: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: '8px',
    padding: '5px 10px',
  },
  videoLabelText: {
    color: '#fff',
    fontSize: '12px',
    fontWeight: '500',
  },
  connectingContainer: {
    textAlign: 'center',
    padding: '30px',
  },
  loader: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid #fff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px',
  },
  connectingText: {
    margin: 0,
    opacity: 0.9,
  },
  controlsContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  actionBtn: {
    border: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    color: '#fff',
  },
  primaryBtn: {
    background: 'linear-gradient(45deg, #667eea, #764ba2)',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    color: '#fff',
  },
  disconnectBtn: {
    background: 'linear-gradient(45deg, #e74c3c, #c0392b)',
  },
  nextBtn: {
    background: 'linear-gradient(45deg, #27ae60, #229954)',
  },
  circleBtn: {
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }
  
  button:active {
    transform: translateY(0px);
  }
`;
document.head.appendChild(styleSheet);


