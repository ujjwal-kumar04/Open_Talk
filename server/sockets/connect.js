// const User = require('../models/User');

// let waitingUsers = [];

// module.exports = function setupSockets(io) {
//   io.on('connection', (socket) => {
//     console.log('Socket connected', socket.id);

//     // Mark user online when they provide token info (client will emit this)
//     socket.on('iamonline', async ({ userId }) => {
//       try {
//         if (!userId) return;
//         await User.findByIdAndUpdate(userId, { online: true, socketId: socket.id });
//         socket.userId = userId;
//       } catch (e) {
//         console.error(e);
//       }
//     });

//     socket.on('findPartner', async ({ userId }) => {
//       try {
//         // remove if same socket exists in waiting
//         waitingUsers = waitingUsers.filter(w => w.socket.id !== socket.id);

//         // find a partner that's not the same user
//         const candidateIndex = waitingUsers.findIndex(w => w.userId !== userId);
//         if (candidateIndex !== -1) {
//           const partner = waitingUsers.splice(candidateIndex, 1)[0];
//           const roomId = socket.id + '#' + partner.socket.id;

//           socket.join(roomId);
//           partner.socket.join(roomId);

//           // send matched event along with partner profile
//           const partnerProfile = await User.findById(partner.userId).select('-password');
//           const myProfile = await User.findById(userId).select('-password');

//           io.to(socket.id).emit('matched', { roomId, partner: partnerProfile, me: myProfile });
//           io.to(partner.socket.id).emit('matched', { roomId, partner: myProfile, me: partnerProfile });

//         } else {
//           // push to waiting list
//           waitingUsers.push({ socket, userId });
//           io.to(socket.id).emit('waiting');
//         }
//       } catch (e) {
//         console.error(e);
//       }
//     });

//     socket.on('offer', (data) => {
//       socket.to(data.roomId).emit('offer', data.offer);
//     });

//     socket.on('answer', (data) => {
//       socket.to(data.roomId).emit('answer', data.answer);
//     });

//     socket.on('ice-candidate', (data) => {
//       socket.to(data.roomId).emit('ice-candidate', data.candidate);
//     });

//     socket.on('leave', async ({ userId, roomId }) => {
//       try {
//         socket.leave(roomId);
//         // mark user offline? we'll leave online status until disconnect
//       } catch (e) {}
//     });

//     socket.on('disconnect', async () => {
//       try {
//         waitingUsers = waitingUsers.filter(w => w.socket.id !== socket.id);
//         if (socket.userId) {
//           await User.findByIdAndUpdate(socket.userId, { online: false, socketId: null });
//         }
//         console.log('Socket disconnected', socket.id);
//       } catch (e) {
//         console.error(e);
//       }
//     });
//   });
// };


const User = require("../models/User");

let waitingUsers = [];

module.exports = function setupSockets(io) {
  io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // user online
    socket.on("iamonline", async ({ userId }) => {
      try {
        if (!userId) return;
        await User.findByIdAndUpdate(userId, {
          online: true,
          socketId: socket.id,
        });
        socket.userId = userId;
      } catch (err) {
        console.error("❌ iamonline error:", err);
      }
    });

    // find a random partner
    socket.on("findPartner", async ({ userId }) => {
      try {
        // remove if already in waiting
        waitingUsers = waitingUsers.filter((w) => w.socket.id !== socket.id);

        const candidateIndex = waitingUsers.findIndex(
          (w) => w.userId !== userId
        );

        if (candidateIndex !== -1) {
          const partner = waitingUsers.splice(candidateIndex, 1)[0];
          const roomId = socket.id + "#" + partner.socket.id;

          socket.join(roomId);
          partner.socket.join(roomId);

          // fetch profiles
          const partnerProfile = await User.findById(partner.userId).select(
            "-password"
          );
          const myProfile = await User.findById(userId).select("-password");

          // assign offer/answer roles
          io.to(socket.id).emit("matched", {
            roomId,
            partner: partnerProfile,
            me: myProfile,
            shouldCreateOffer: true, // this user will create offer
          });

          io.to(partner.socket.id).emit("matched", {
            roomId,
            partner: myProfile,
            me: partnerProfile,
            shouldCreateOffer: false, // this user will only answer
          });
        } else {
          waitingUsers.push({ socket, userId });
          io.to(socket.id).emit("waiting");
        }
      } catch (err) {
        console.error("❌ findPartner error:", err);
      }
    });

    // signaling events
    socket.on("offer", ({ roomId, offer }) => {
      socket.to(roomId).emit("offer", { offer, from: socket.id });
    });

    socket.on("answer", ({ roomId, answer }) => {
      socket.to(roomId).emit("answer", { answer, from: socket.id });
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
      socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
    });

    // leave room
    socket.on("leave", ({ roomId }) => {
      socket.leave(roomId);
    });

    // disconnect
    socket.on("disconnect", async () => {
      try {
        waitingUsers = waitingUsers.filter((w) => w.socket.id !== socket.id);

        if (socket.userId) {
          await User.findByIdAndUpdate(socket.userId, {
            online: false,
            socketId: null,
          });
        }

        console.log("❌ Socket disconnected:", socket.id);
      } catch (err) {
        console.error("❌ disconnect error:", err);
      }
    });
  });
};
