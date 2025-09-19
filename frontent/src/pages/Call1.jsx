// import React, { useEffect, useRef, useState } from 'react';
// import socket from '../socket';

// let pc;
// let localStream; // 🔹 keep reference of local stream

// export default function Call1({ user, roomInfo, setPage }) {
//   const localVideo = useRef();
//   const remoteVideo = useRef();
//   const [inCall, setInCall] = useState(false);
//   const [partner, setPartner] = useState(roomInfo.partner || null);
//   const [roomId, setRoomId] = useState(roomInfo.roomId || null);

//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOff, setIsVideoOff] = useState(false);

//   useEffect(() => {
//     socket.emit('iamonline', { userId: user.id });

//     if (roomId && partner) {
//       startPeer(roomId).catch(console.error);
//     }

//     const onOffer = async (offer) => {
//       if (!pc) await startPeer(roomId, false);
//       await pc.setRemoteDescription(offer);
//       const answer = await pc.createAnswer();
//       await pc.setLocalDescription(answer);
//       socket.emit('answer', { roomId, answer });
//     };

//     const onAnswer = async (answer) => {
//       if (pc) await pc.setRemoteDescription(answer);
//     };

//     const onIceCandidate = async (candidate) => {
//       if (pc) await pc.addIceCandidate(candidate);
//     };

//     socket.on('offer', onOffer);
//     socket.on('answer', onAnswer);
//     socket.on('ice-candidate', onIceCandidate);

//     return () => {
//       if (pc) pc.close();
//       pc = null;
//       socket.off('offer', onOffer);
//       socket.off('answer', onAnswer);
//       socket.off('ice-candidate', onIceCandidate);
//       window.onbeforeunload = null;
//     };
//   }, [roomId, partner]);

//   const startPeer = async (rId, initiator = true) => {
//     pc = new RTCPeerConnection();
//     setInCall(true);

//     try {
//       localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
//     } catch (err) {
//       console.error('getUserMedia failed', err);
//       setInCall(false);
//       return;
//     }

//     if (localVideo.current) localVideo.current.srcObject = localStream;

//     localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

//     pc.ontrack = (e) => {
//       if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0];
//     };

//     pc.onicecandidate = (event) => {
//       if (event.candidate) {
//         socket.emit('ice-candidate', { roomId: rId, candidate: event.candidate });
//       }
//     };

//     if (initiator) {
//       const offer = await pc.createOffer();
//       await pc.setLocalDescription(offer);
//       socket.emit('offer', { roomId: rId, offer });
//     }

//     window.onbeforeunload = () => {
//       socket.emit('leave', { userId: user.id, roomId: rId });
//     };
//   };

//   const leave = () => {
//     if (pc) pc.close();
//     pc = null;
//     if (roomId) socket.emit('leave', { userId: user.id, roomId });
//     setInCall(false);
//     setPartner(null);
//     setRoomId(null);
//     window.onbeforeunload = null;
//     if (setPage) setPage('profile');
//   };

//   const next = () => {
//     leave();
//     if (setPage) setPage('connect'); // go to connect page for next random user
//   };

//   // 🎤 Toggle Mute
//   const toggleMute = () => {
//     if (!localStream) return;
//     localStream.getAudioTracks().forEach(track => (track.enabled = !track.enabled));
//     setIsMuted(prev => !prev);
//   };

//   // 📷 Toggle Video
//   const toggleVideo = () => {
//     if (!localStream) return;
//     localStream.getVideoTracks().forEach(track => (track.enabled = !track.enabled));
//     setIsVideoOff(prev => !prev);
//   };

//   return (
//     <div style={styles.container}>
//       <h2 style={styles.title}>Video Call</h2>
//       {partner && <p style={styles.partner}>Partner: {partner.username}</p>}

//       <div style={styles.videoContainer}>
//         <video ref={localVideo} autoPlay muted style={styles.videoBox} />
//         <video ref={remoteVideo} autoPlay style={styles.videoBox} />
//       </div>

//       {!inCall && <p style={styles.status}>Waiting to join call...</p>}

//       {inCall && (
//         <div style={styles.buttonGroup}>
//           <button style={styles.disconnectBtn} onClick={leave}>
//             Disconnect
//           </button>
//           <button style={styles.nextBtn} onClick={next}>
//             Next
//           </button>
//           <button
//             style={{ ...styles.circleBtn, backgroundColor: isMuted ? '#dc3545' : '#007BFF' }}
//             onClick={toggleMute}
//           >
//             {isMuted ? 'Unmute' : 'Mute'}
//           </button>
//           <button
//             style={{ ...styles.circleBtn, backgroundColor: isVideoOff ? '#dc3545' : '#28a745' }}
//             onClick={toggleVideo}
//           >
//             {isVideoOff ? 'Video On' : 'Video Off'}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// const styles = {
//   container: {
//     maxWidth: 900,
//     margin: '30px auto',
//     padding: 20,
//     borderRadius: 10,
//     boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
//     backgroundColor: '#fff',
//     textAlign: 'center',
//   },
//   title: {
//     color: '#007BFF',
//     fontSize: 28,
//     marginBottom: 10,
//   },
//   partner: {
//     fontSize: 18,
//     marginBottom: 15,
//   },
//   videoContainer: {
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//     gap: 15,
//     flexWrap: 'wrap',
//   },
//   videoBox: {
//     width: '400px',
//     height: '300px',
//     borderRadius: 8,
//     background: '#000',
//     objectFit: 'cover',
//   },
//   status: {
//     marginTop: 15,
//     fontSize: 16,
//   },
//   buttonGroup: {
//     marginTop: 20,
//     display: 'flex',
//     justifyContent: 'center',
//     gap: 15,
//     flexWrap: 'wrap',
//   },
//   disconnectBtn: {
//     padding: '10px 25px',
//     fontSize: 16,
//     backgroundColor: '#dc3545',
//     color: '#fff',
//     border: 'none',
//     borderRadius: 6,
//     cursor: 'pointer',
//   },
//   nextBtn: {
//     padding: '10px 25px',
//     fontSize: 16,
//     backgroundColor: '#28a745',
//     color: '#fff',
//     border: 'none',
//     borderRadius: 6,
//     cursor: 'pointer',
//   },
//   circleBtn: {
//     width: 60,
//     height: 60,
//     borderRadius: '50%',
//     border: 'none',
//     color: '#fff',
//     fontSize: 14,
//     cursor: 'pointer',
//   },
// };
import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket';

let pc;
let localStream;
let remoteStream;
let iceQueue = [];

export default function Call1({ user, setPage }) {
  const localVideo = useRef();
  const remoteVideo = useRef();

  const [inCall, setInCall] = useState(false);
  const [partner, setPartner] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    // Mark user online
    socket.emit('iamonline', { userId: user.id });

    // 🔹 Start searching for a partner automatically
    socket.emit('findPartner', { userId: user.id });

    const onMatched = ({ roomId, partner }) => {
      setRoomId(roomId);
      setPartner(partner);
      startPeer(roomId, true);
    };

    const onOffer = async ({ offer }) => {
      if (!pc) await startPeer(roomId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { roomId, answer });

      iceQueue.forEach(async candidate => {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        catch (e) { console.error('Failed to add queued candidate', e); }
      });
      iceQueue = [];
    };

    const onAnswer = async ({ answer }) => {
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIceCandidate = async ({ candidate }) => {
      if (!candidate) return;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
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
  }, [user.id, roomId]);

  const startPeer = async (rId, initiator = true) => {
    pc = new RTCPeerConnection();
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
      remoteStream = e.streams[0];
      if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId: rId, candidate: event.candidate });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE state:', pc.iceConnectionState);
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { roomId: rId, offer });
    }

    window.onbeforeunload = () => leave();
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

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Video Call</h2>
      {partner && <p style={styles.partner}>Partner: {partner.username}</p>}

      <div style={styles.videoContainer}>
        <video ref={localVideo} autoPlay muted style={styles.videoBox} />
        <video ref={remoteVideo} autoPlay style={styles.videoBox} />
      </div>

      {!inCall && <p style={styles.status}>Waiting to join call...</p>}

      {inCall && (
        <div style={styles.buttonGroup}>
          <button style={styles.disconnectBtn} onClick={leave}>Disconnect</button>
          <button style={styles.nextBtn} onClick={next}>Next</button>
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
    </div>
  );
}

const styles = {
  container: { maxWidth: 900, margin: '30px auto', padding: 20, borderRadius: 10, boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backgroundColor: '#fff', textAlign: 'center' },
  title: { color: '#007BFF', fontSize: 28, marginBottom: 10 },
  partner: { fontSize: 18, marginBottom: 15 },
  videoContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 15, flexWrap: 'wrap' },
  videoBox: { width: '400px', height: '300px', borderRadius: 8, background: '#000', objectFit: 'cover' },
  status: { marginTop: 15, fontSize: 16 },
  buttonGroup: { marginTop: 20, display: 'flex', justifyContent: 'center', gap: 15, flexWrap: 'wrap' },
  disconnectBtn: { padding: '10px 25px', fontSize: 16, backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  nextBtn: { padding: '10px 25px', fontSize: 16, backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  circleBtn: { width: 60, height: 60, borderRadius: '50%', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer' },
};



