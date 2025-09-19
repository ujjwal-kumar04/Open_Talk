const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

require('dotenv').config();

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const setupSockets = require('./sockets/connect');





const app = express();
app.use(cors({
  origin: "https://connecteas.netlify.app", 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());



const MONGO_URL = process.env.MONGO_URL;
mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error', err));

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
setupSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log('Server running on port', PORT));
