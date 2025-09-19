// src/socket.js
import { io } from "socket.io-client";

const socket = io("https://open-talk-1.onrender.com", {
  transports: ["websocket"],
  autoConnect: true
});

export default socket;
