import { io } from 'socket.io-client';
src/socket.js

const socket = io("https://open-talk-1.onrender.com", {
  transports: ["websocket"],
  autoConnect: true
});

export default socket;
