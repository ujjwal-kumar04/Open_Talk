// import React, { useState } from 'react';
// import axios from 'axios';

// export default function Register({ afterRegister }) {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [gender, setGender] = useState('');
//   const [loading, setLoading] = useState(false);

//   const register = async () => {
//     if (!username || !password || !gender) {
//       alert('Please fill all fields');
//       return;
//     }
//     setLoading(true);
//     try {
//       const res = await axios.post('http://localhost:5000/auth/register', { 
//         username, 
//         password, 
//         gender 
//       });
//       afterRegister(res.data);
//     } catch (e) {
//       alert(e.response?.data?.msg || 'Error');
//     }
//     setLoading(false);
//   };

//   return (
//     <div style={styles.container}>
//       <h2 style={styles.title}>Register</h2>
//       <input
//         style={styles.input}
//         placeholder="Username"
//         value={username}
//         onChange={e => setUsername(e.target.value)}
//       />
//       <input
//         style={styles.input}
//         type="password"
//         placeholder="Password"
//         value={password}
//         onChange={e => setPassword(e.target.value)}
//       />

//       {/* Gender dropdown */}
//       <select
//         style={styles.input}
//         value={gender}
//         onChange={e => setGender(e.target.value)}
//       >
//         <option value="">Select Gender</option>
//         <option value="male">Male</option>
//         <option value="female">Female</option>
//         <option value="other">Other</option>
//       </select>

//       <button style={styles.button} onClick={register} disabled={loading}>
//         {loading ? 'Registering...' : 'Register'}
//       </button>
//     </div>
//   );
// }

// const styles = {
//   container: {
//     maxWidth: 400,
//     margin: '50px auto',
//     padding: 20,
//     borderRadius: 10,
//     boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
//     backgroundColor: '#fff',
//     display: 'flex',
//     flexDirection: 'column',
//     alignItems: 'center',
//   },
//   title: {
//     marginBottom: 20,
//     color: '#007BFF',
//     fontSize: 28,
//     fontWeight: 'bold',
//   },
//   input: {
//     width: '100%',
//     padding: 10,
//     marginBottom: 15,
//     borderRadius: 6,
//     border: '1px solid #ccc',
//     fontSize: 16,
//   },
//   button: {
//     width: '100%',
//     padding: 10,
//     borderRadius: 6,
//     border: 'none',
//     backgroundColor: '#28a745',
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//     cursor: 'pointer',
//     transition: '0.2s',
//   },
// };
import React, { useState } from 'react';
import axios from 'axios';

export default function Register({ afterRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!username || !password || !gender) {
      alert('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/auth/register', { 
        username, password, gender 
      });
      afterRegister(res.data);
    } catch(e) {
      alert(e.response?.data?.msg || 'Error');
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Register</h2>
      <input style={styles.input} placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} />
      <input style={styles.input} type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
      <select style={styles.input} value={gender} onChange={e=>setGender(e.target.value)}>
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
        <option value="other">Other</option>
      </select>
      <button style={styles.button} onClick={register} disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>

      {/* Social Login */}
      <button style={{ ...styles.button, backgroundColor:'#4267B2', marginTop:10 }}
        onClick={()=>window.location.href='http://localhost:5000/auth/facebook'}>
        Register / Login with Facebook
      </button>
      <button style={{ ...styles.button, backgroundColor:'#DB4437', marginTop:10 }}
        onClick={()=>window.location.href='http://localhost:5000/auth/google'}>
        Register / Login with Google
      </button>
    </div>
  );
}

const styles = {
  container: { maxWidth:400, margin:'50px auto', padding:20, borderRadius:10, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', backgroundColor:'#fff', display:'flex', flexDirection:'column', alignItems:'center' },
  title: { marginBottom:20, color:'#007BFF', fontSize:28, fontWeight:'bold' },
  input: { width:'100%', padding:10, marginBottom:15, borderRadius:6, border:'1px solid #ccc', fontSize:16 },
  button: { width:'100%', padding:10, borderRadius:6, border:'none', color:'#fff', fontSize:16, fontWeight:'bold', cursor:'pointer', transition:'0.2s' },
};
