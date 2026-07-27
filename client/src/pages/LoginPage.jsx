import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from 'axios';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const GRAD = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
const PRIMARY = '#4f46e5';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Forgot Password States
  const [mode, setMode] = useState('login'); // 'login', 'forgot-email', 'forgot-otp', 'forgot-reset'
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      login(data.user, data.token);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email: resetEmail });
      setSuccess(data.message);
      setMode('forgot-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/verify-reset-otp', { email: resetEmail, otp: resetOtp });
      setSuccess(data.message);
      setMode('forgot-reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/reset-password', { email: resetEmail, otp: resetOtp, newPassword });
      setSuccess(data.message);
      setTimeout(() => {
        setSuccess('');
        setMode('login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const inp = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', marginBottom: '12px', fontFamily: 'inherit', color: '#1f2937', background: '#fff' };

  return (
    <div style={{ minHeight: '100vh', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '330px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', color: '#1f2937' }}>
        
        {mode === 'login' && (
          <>
            <h2 style={{ textAlign: 'center', color: PRIMARY, marginBottom: '8px', fontSize: '1.4rem', fontWeight: 'bold' }}>🔑 Account Login</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px', fontWeight: '500' }}>Hope you have a beautiful day! 😊</p>
            
            {success && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{success}</div>}
            {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder="Email / Username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inp}
              />
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ ...inp, marginBottom: 0, paddingRight: '45px' }}
                />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '1.2rem', userSelect: 'none', zIndex: 10 }}>
                  {showPassword ? '👁️' : '🙈'}
                </span>
              </div>
              <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                <span onClick={() => { setMode('forgot-email'); setError(''); setSuccess(''); }} style={{ color: PRIMARY, cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>Forgot Password?</span>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '1.05rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Logging in...' : '→ Login to Account'}
              </button>
            </form>
            
            <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#6b7280' }}>
              No account? <span onClick={() => navigate('/register')} style={{ color: PRIMARY, cursor: 'pointer', fontWeight: 'bold' }}>Register here</span>
            </p>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '8px' }}>
              <span onClick={() => navigate('/auth')} style={{ color: PRIMARY, cursor: 'pointer' }}>← Back</span>
            </p>
          </>
        )}

        {mode === 'forgot-email' && (
          <>
            <h2 style={{ textAlign: 'center', color: PRIMARY, marginBottom: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Forgot Password</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', marginBottom: '20px' }}>Enter your email to receive an OTP.</p>
            {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
            <form onSubmit={handleSendResetOTP}>
              <input type="email" placeholder="Email Address" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required style={inp} />
              <button type="submit" disabled={loading} style={{ width: '100%', background: PRIMARY, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '16px' }}>
              <span onClick={() => { setMode('login'); setError(''); }} style={{ color: '#6b7280', cursor: 'pointer' }}>← Back to Login</span>
            </p>
          </>
        )}

        {mode === 'forgot-otp' && (
          <>
            <h2 style={{ textAlign: 'center', color: PRIMARY, marginBottom: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Verify OTP</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', marginBottom: '20px' }}>Enter the 6-digit code sent to {resetEmail}</p>
            {success && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{success}</div>}
            {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
            <form onSubmit={handleVerifyResetOTP}>
              <input type="text" placeholder="Enter OTP" value={resetOtp} onChange={e => setResetOtp(e.target.value)} maxLength="6" required style={{ ...inp, textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 'bold' }} />
              <button type="submit" disabled={loading} style={{ width: '100%', background: PRIMARY, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
            <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '16px' }}>
              <span onClick={() => { setMode('forgot-email'); setError(''); setSuccess(''); }} style={{ color: '#6b7280', cursor: 'pointer' }}>← Back</span>
            </p>
          </>
        )}

        {mode === 'forgot-reset' && (
          <>
            <h2 style={{ textAlign: 'center', color: PRIMARY, marginBottom: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}>Reset Password</h2>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem', marginBottom: '20px' }}>Enter your new password below.</p>
            {success && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{success}</div>}
            {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
            <form onSubmit={handleResetPassword}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ ...inp, marginBottom: 0, paddingRight: '45px' }} />
                <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '1.2rem', userSelect: 'none', zIndex: 10 }}>{showPassword ? '👁️' : '🙈'}</span>
              </div>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm New Password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required style={{ ...inp, marginBottom: 0, paddingRight: '45px' }} />
                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '1.2rem', userSelect: 'none', zIndex: 10 }}>{showConfirmPassword ? '👁️' : '🙈'}</span>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};

export default LoginPage;
