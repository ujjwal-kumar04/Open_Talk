# OpenTalk Voice - Minimal Prototype

## What's included
- server/ : Node.js + Express + Socket.io + Mongoose backend
- client/ : React frontend (create-react-app style)

## How to run

### Server
1. Open terminal and go to server folder:
   ```
   cd server
   npm install
   ```
2. Set environment variables if needed:
   - MONGO_URL (defaults to mongodb://127.0.0.1:27017/opentalk_voice)
   - JWT_SECRET
3. Start server:
   ```
   node index.js
   ```

### Client
1. Open another terminal and go to client folder:
   ```
   cd client
   npm install
   npm start
   ```

The client expects the backend on http://localhost:5000. Adjust endpoints if needed.

## Notes
- This is a minimal prototype: add validation, error handling, UI polishing, and production deployment steps.
- For production use, secure JWT secrets, enable HTTPS, and use TURN servers for WebRTC if users are behind restrictive NATs.
