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
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const inp = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', marginBottom: '12px', fontFamily: 'inherit', color: '#1f2937', background: '#fff' };

  return (
    <div style={{ minHeight: '100vh', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', width: '90%', maxWidth: '330px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', color: '#1f2937' }}>
        <h2 style={{ textAlign: 'center', color: PRIMARY, marginBottom: '8px', fontSize: '1.4rem', fontWeight: 'bold' }}>🔑 Account Login</h2>
        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', marginBottom: '20px', fontWeight: '500' }}>Hope you have a beautiful day! 😊</p>
        
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
          <div style={{ position: 'relative', marginBottom: '20px' }}>
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
      </div>
    </div>
  );
};

export default LoginPage;
