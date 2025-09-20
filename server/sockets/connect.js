const User = require('../models/User');

let waitingUsers = [];

module.exports = function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected', socket.id);

    socket.on('iamonline', async ({ userId }) => {
      try {
        if (!userId) return;
        await User.findByIdAndUpdate(userId, { online: true, socketId: socket.id });
        socket.userId = userId;
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('findPartner', async ({ userId }) => {
      try {
        waitingUsers = waitingUsers.filter(w => w.socket.id !== socket.id);
        const candidateIndex = waitingUsers.findIndex(w => w.userId !== userId);

        if (candidateIndex !== -1) {
          const partner = waitingUsers.splice(candidateIndex, 1)[0];
          const roomId = socket.id + '#' + partner.socket.id;

          socket.join(roomId);
          partner.socket.join(roomId);

          const partnerProfile = await User.findById(partner.userId).select('-password');
          const myProfile = await User.findById(userId).select('-password');

          io.to(socket.id).emit('matched', { roomId, partner: partnerProfile, me: myProfile });
          io.to(partner.socket.id).emit('matched', { roomId, partner: myProfile, me: partnerProfile });

        } else {
          waitingUsers.push({ socket, userId });
          io.to(socket.id).emit('waiting');
        }
      } catch (e) {
        console.error(e);
      }
    });

    socket.on('offer', ({ roomId, offer }) => {
      socket.to(roomId).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ roomId, answer }) => {
      socket.to(roomId).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate, from: socket.id });
    });

    socket.on('leave', ({ userId, roomId }) => {
      console.log('User leaving room:', userId, roomId);
      socket.leave(roomId);
      socket.to(roomId).emit('user-left', { userId });
    });

    socket.on('disconnect', async () => {
      try {
        waitingUsers = waitingUsers.filter(w => w.socket.id !== socket.id);
        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, { online: false, socketId: null });
        }
        console.log('Socket disconnected', socket.id);
      } catch (e) {
        console.error(e);
      }
    });
  });
};

