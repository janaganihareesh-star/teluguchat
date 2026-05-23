import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from 'axios';
import CookieBanner from '../components/CookieBanner';

const GRAD = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
const PRIMARY = '#4f46e5';
const GOLD = '#f59e0b';

const AuthSelection = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  // Modals state
  const [showGuest, setShowGuest] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // Forms state
  const [guestForm, setGuestForm] = useState({ username: '', gender: 'Male', day: '1', month: 'January', year: '2000' });
  const [regForm, setRegForm] = useState({ username: '', password: '', email: '', gender: 'Male', day: '1', month: 'January', year: '2000' });
  
  // Async flow state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 18 - i);

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(15,12,41,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' };
  const modal = { background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '380px', position: 'relative', boxShadow: '0 24px 80px rgba(79,70,229,0.3)', color: '#1f2937' };
  const inp = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', marginBottom: '12px', fontFamily: 'inherit', transition: 'border-color 0.2s', color: '#1f2937', background: '#fff' };
  const closeBtn = { position: 'absolute', top: '14px', right: '16px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af', lineHeight: 1 };
  const sel = { flex: 1, padding: '10px 8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.88rem', outline: 'none', color: '#1f2937', background: '#fff' };

  // Guest Login Submission
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    if (!guestForm.username.trim()) {
      setError('Please choose a username.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const birthYear = parseInt(guestForm.year);
      const age = new Date().getFullYear() - birthYear;
      
      const response = await axiosInstance.post('http://localhost:3500/api/auth/guest-login', {
        username: guestForm.username,
        gender: guestForm.gender,
        age: age
      });
      
      login(response.data.user, response.data.token);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Guest login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Register Form Submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regForm.username.trim() || !regForm.password || !regForm.email.trim()) {
      setError('Username, Password, and Email are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const birthYear = parseInt(regForm.year);
      const age = new Date().getFullYear() - birthYear;

      await axiosInstance.post('http://localhost:3500/api/auth/register', {
        username: regForm.username,
        password: regForm.password,
        email: regForm.email,
        gender: regForm.gender,
        age: age,
        country: 'India'
      });

      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        setShowRegister(false);
        setSuccess('');
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const openRegisterModal = () => {
    setError('');
    setSuccess('');
    setShowPassword(false);
    setRegForm({ username: '', password: '', email: '', gender: 'Male', day: '1', month: 'January', year: '2000' });
    setShowRegister(true);
  };

  const openGuestModal = () => {
    setError('');
    setSuccess('');
    setGuestForm({ username: '', gender: 'Male', day: '1', month: 'January', year: '2000' });
    setShowGuest(true);
  };

  return (
    <div style={{ minHeight: '100vh', background: GRAD, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Arial, sans-serif", position: 'relative', overflow: 'hidden' }}>
      {/* Glow orbs */}
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '350px', height: '350px', background: 'rgba(99,102,241,0.25)', borderRadius: '50%', filter: 'blur(100px)' }} />
      <div style={{ position: 'absolute', bottom: '-80px', right: '-80px', width: '280px', height: '280px', background: 'rgba(245,158,11,0.15)', borderRadius: '50%', filter: 'blur(80px)' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '360px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <Logo size={52} showText={false} />
          </div>
          <h1 style={{ color: '#fff', fontSize: '1.8rem', margin: '0 0 4px', fontWeight: '900' }}>
            తెలుగు<span style={{ color: GOLD }}>Chat</span>
          </h1>
          <p style={{ color: '#a5b4fc', margin: 0, fontSize: '0.88rem' }}>Free · Real-Time · Telugu Community</p>
        </div>

        {/* Glassmorphism Card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <p style={{ color: '#e2e8f0', margin: 0, fontSize: '0.95rem', fontWeight: '500' }}>Hope you have a beautiful day! 😊</p>
          </div>

          <button onClick={() => navigate('/login')}
            style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(79,70,229,0.4)' }}>
            → Login to Account
          </button>
          
          <button onClick={openGuestModal}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', padding: '14px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer' }}>
            👤 Guest Login
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
            <span style={{ color: '#6366f1', fontSize: '0.8rem' }}>NEW?</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <button onClick={openRegisterModal}
            style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, #d97706)`, color: '#1f2937', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 20px rgba(245,158,11,0.35)' }}>
            ✏️ Register — It's Free!
          </button>
        </div>
        <p style={{ textAlign: 'center', color: '#6366f1', fontSize: '0.75rem', marginTop: '16px' }}>
          By joining you agree to our Terms & Community Rules
        </p>
      </div>

      {/* Guest Modal */}
      {showGuest && (
        <div style={overlay} onClick={() => setShowGuest(false)}>
          <form onSubmit={handleGuestSubmit} style={modal} onClick={e => e.stopPropagation()}>
            <button type="button" style={closeBtn} onClick={() => setShowGuest(false)}>×</button>
            <h2 style={{ color: PRIMARY, marginBottom: '20px', fontSize: '1.2rem', textAlign: 'center' }}>👤 Guest Login</h2>
            
            {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', textAlign: 'center' }}>{error}</div>}

            <input style={inp} placeholder="Choose a Username" value={guestForm.username} onChange={e => setGuestForm({ ...guestForm, username: e.target.value })} required />
            <select style={{ ...inp }} value={guestForm.gender} onChange={e => setGuestForm({ ...guestForm, gender: e.target.value })}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '6px', display: 'block' }}>Date of Birth</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <select style={sel} value={guestForm.day} onChange={e => setGuestForm({ ...guestForm, day: e.target.value })}>{days.map(d=><option key={d} value={d}>{d}</option>)}</select>
              <select style={sel} value={guestForm.month} onChange={e => setGuestForm({ ...guestForm, month: e.target.value })}>{months.map(m=><option key={m} value={m}>{m}</option>)}</select>
              <select style={sel} value={guestForm.year} onChange={e => setGuestForm({ ...guestForm, year: e.target.value })}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Entering...' : '→ Enter as Guest'}
            </button>
          </form>
        </div>
      )}

      {/* Register Modal */}
      {showRegister && (
        <div style={overlay} onClick={() => setShowRegister(false)}>
          <div style={{ ...modal, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button style={closeBtn} onClick={() => setShowRegister(false)}>×</button>
            <h2 style={{ color: PRIMARY, marginBottom: '20px', fontSize: '1.2rem', textAlign: 'center' }}>✏️ Create Account</h2>
            
            {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', textAlign: 'center' }}>{error}</div>}
            {success && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', textAlign: 'center' }}>{success}</div>}

            <form onSubmit={handleRegisterSubmit}>
              <input style={inp} placeholder="Username" value={regForm.username} onChange={e => setRegForm({ ...regForm, username: e.target.value })} required />
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input style={{ ...inp, marginBottom: 0, paddingRight: '45px' }} type={showPassword ? 'text' : 'password'} placeholder="Password" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} required />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '1.2rem', userSelect: 'none', zIndex: 10 }}>
                  {showPassword ? '👁️' : '🙈'}
                </span>
              </div>
              <input style={inp} type="email" placeholder="Email" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} required />
              <select style={{ ...inp }} value={regForm.gender} onChange={e => setRegForm({ ...regForm, gender: e.target.value })}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
              <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '6px', display: 'block' }}>Date of Birth</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <select style={sel} value={regForm.day} onChange={e => setRegForm({ ...regForm, day: e.target.value })}>{days.map(d=><option key={d} value={d}>{d}</option>)}</select>
                <select style={sel} value={regForm.month} onChange={e => setRegForm({ ...regForm, month: e.target.value })}>{months.map(m=><option key={m} value={m}>{m}</option>)}</select>
                <select style={sel} value={regForm.year} onChange={e => setRegForm({ ...regForm, year: e.target.value })}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, #d97706)`, color: '#1f2937', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '12px', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating...' : '✏️ Register Now'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '14px' }}>
              Already have an account? <span onClick={() => { setShowRegister(false); navigate('/login'); }} style={{ color: PRIMARY, cursor: 'pointer', fontWeight: 'bold' }}>Login</span>
            </p>
          </div>
        </div>
      )}

      <CookieBanner />
    </div>
  );
};

export default AuthSelection;
