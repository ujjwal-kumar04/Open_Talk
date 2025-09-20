
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
      
      // Ensure we have a room ID before proceeding
      const currentRoomId = roomId || roomInfo?.roomId;
      if (!currentRoomId) {
        console.error('No room ID available to handle offer');
        return;
      }
      
      if (!pc) {
        console.log('Creating peer connection as receiver');
        await startPeer(currentRoomId, false);
      }
      
      try {
        console.log('Setting remote description with offer');
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('Remote description set successfully');
        
        console.log('Creating answer');
        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        console.log('Setting local description with answer');
        await pc.setLocalDescription(answer);
        console.log('Local description set successfully');
        
        console.log('Sending answer back to room:', currentRoomId);
        socket.emit('answer', { roomId: currentRoomId, answer });

        // add any queued ICE candidates
        if (iceQueue.length > 0) {
          console.log('Processing queued ICE candidates:', iceQueue.length);
          iceQueue.forEach(async candidate => {
            try { 
              await pc.addIceCandidate(new RTCIceCandidate(candidate)); 
              console.log('Added queued ICE candidate');
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
      console.log('Received answer from:', from);
      console.log('PC state:', pc?.signalingState);
      
      if (!pc) {
        console.error('No peer connection available to handle answer');
        return;
      }
      
      if (pc.signalingState !== 'have-local-offer') {
        console.log('PC not in correct state for answer. Current state:', pc.signalingState);
        return;
      }
      
      try {
        console.log('Setting remote description with answer');
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Remote answer set successfully');
        
        // Process any queued ICE candidates
        if (iceQueue.length > 0) {
          console.log('Processing queued ICE candidates after answer:', iceQueue.length);
          iceQueue.forEach(async candidate => {
            try { 
              await pc.addIceCandidate(new RTCIceCandidate(candidate)); 
              console.log('Added queued ICE candidate after answer');
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
      console.log('Received ICE candidate from:', from);
      console.log('Candidate type:', candidate?.candidate?.includes('typ') ? candidate.candidate.split('typ ')[1]?.split(' ')[0] : 'unknown');
      
      if (!candidate) {
        console.log('End of ICE candidates');
        return;
      }
      
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('ICE candidate added successfully');
        } catch (e) {
          console.error('Error adding ICE candidate:', e);
        }
      } else {
        console.log('Queueing ICE candidate - remote description not set yet');
        iceQueue.push(candidate);
        console.log('ICE queue length:', iceQueue.length);
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
      console.log('=== ONTRACK EVENT ===');
      console.log('Track kind:', e.track.kind);
      console.log('Track readyState:', e.track.readyState);
      console.log('Track enabled:', e.track.enabled);
      console.log('Streams count:', e.streams.length);
      console.log('Stream ID:', e.streams[0]?.id);
      
      if (e.streams && e.streams[0]) {
        remoteStream = e.streams[0];
        console.log('Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.readyState}`));
        
        if (remoteVideo.current) {
          console.log('Setting remote video srcObject');
          remoteVideo.current.srcObject = remoteStream;
          
          // Force video to play
          setTimeout(() => {
            remoteVideo.current.play().then(() => {
              console.log('Remote video playing successfully');
            }).catch(err => {
              console.error('Error playing remote video:', err);
            });
          }, 100);
        } else {
          console.error('Remote video element not available');
        }
      } else {
        console.error('No streams in ontrack event');
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
    console.log('=== CONNECTION DEBUG INFO ===');
    console.log('Room ID:', roomId);
    console.log('Partner:', partner?.username);
    console.log('PC exists:', !!pc);
    
    if (pc) {
      console.log('PC connection state:', pc.connectionState);
      console.log('PC ICE connection state:', pc.iceConnectionState);
      console.log('PC ICE gathering state:', pc.iceGatheringState);
      console.log('PC signaling state:', pc.signalingState);
      console.log('PC local description:', !!pc.localDescription);
      console.log('PC remote description:', !!pc.remoteDescription);
    }
    
    console.log('Local stream exists:', !!localStream);
    console.log('Local stream tracks:', localStream?.getTracks().map(t => `${t.kind}: ${t.readyState}`) || 'none');
    console.log('Remote stream exists:', !!remoteStream);
    console.log('Remote stream tracks:', remoteStream?.getTracks().map(t => `${t.kind}: ${t.readyState}`) || 'none');
    
    console.log('Local video element srcObject:', !!localVideo.current?.srcObject);
    console.log('Remote video element srcObject:', !!remoteVideo.current?.srcObject);
    console.log('Remote video element paused:', remoteVideo.current?.paused);
    console.log('Remote video element readyState:', remoteVideo.current?.readyState);
    
    console.log('ICE queue length:', iceQueue.length);
    console.log('=== END DEBUG INFO ===');
  };

  const forcePlayRemoteVideo = () => {
    console.log('Forcing remote video to play...');
    if (remoteVideo.current && remoteVideo.current.srcObject) {
      remoteVideo.current.play().then(() => {
        console.log('Remote video forced to play successfully');
      }).catch(err => {
        console.error('Error forcing remote video to play:', err);
      });
    } else {
      console.log('Remote video element or srcObject not available');
    }
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
              <button style={styles.playBtn} onClick={forcePlayRemoteVideo}>Force Play Remote</button>
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
  playBtn: { padding: '10px 25px', fontSize: 16, backgroundColor: '#fd7e14', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  circleBtn: { width: 60, height: 60, borderRadius: '50%', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' },
};


