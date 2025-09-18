// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true },
//   password: { type: String, required: true },
//   gender: { 
//     type: String, 
//     enum: ['male', 'female', 'other'], 
//     required: true 
//   },
//   online: { type: Boolean, default: false },
//   socketId: { type: String, default: null }
// }, { timestamps: true });

// module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String },
  password: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  googleId: { type: String, default: null },
  facebookId: { type: String, default: null },
  online: { type: Boolean, default: false },
  socketId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
