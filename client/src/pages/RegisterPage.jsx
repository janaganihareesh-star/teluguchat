import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from 'axios';

const GRAD = 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)';
const PRIMARY = '#4f46e5';
const GOLD = '#f59e0b';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', email: '', gender: 'Male', day: '1', month: 'January', year: '2000' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - 18 - i);

  const inp = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e5e7eb', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', marginBottom: '12px', fontFamily: 'inherit', color: '#1f2937', background: '#fff' };
  const sel = { flex: 1, padding: '10px 8px', borderRadius: '8px', border: '1.5px solid #e5e7eb', fontSize: '0.88rem', outline: 'none', color: '#1f2937', background: '#fff' };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password || !form.email.trim()) {
      setError('Username, Password, and Email are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const birthYear = parseInt(form.year);
      const age = new Date().getFullYear() - birthYear;

      await axiosInstance.post('http://localhost:3500/api/auth/register', {
        username: form.username,
        password: form.password,
        email: form.email,
        gender: form.gender,
        age: age,
        country: 'India'
      });

      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '380px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)', color: '#1f2937' }}>
        <h2 style={{ textAlign: 'center', color: PRIMARY, marginBottom: '24px', fontSize: '1.4rem', fontWeight: 'bold' }}>✏️ Create Account</h2>
        
        {error && <div style={{ background: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
        {success && <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem', textAlign: 'center' }}>{success}</div>}

          <form onSubmit={handleRegisterSubmit}>
            <input style={inp} placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input style={{ ...inp, marginBottom: 0, paddingRight: '45px' }} type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              <span onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: '1.2rem', userSelect: 'none', zIndex: 10 }}>
                {showPassword ? '👁️' : '🙈'}
              </span>
            </div>
            <input style={inp} type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            <select style={{ ...inp }} value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            <label style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '6px', display: 'block' }}>Date of Birth</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <select style={sel} value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d=><option key={d} value={d}>{d}</option>)}</select>
              <select style={sel} value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>{months.map(m=><option key={m} value={m}>{m}</option>)}</select>
              <select style={sel} value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', background: `linear-gradient(135deg, ${GOLD}, #d97706)`, color: '#1f2937', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '1.05rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Registering...' : '✏️ Register Now'}
            </button>
          </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#6b7280' }}>
          Already have an account? <span onClick={() => navigate('/login')} style={{ color: PRIMARY, cursor: 'pointer', fontWeight: 'bold' }}>Login</span>
        </p>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '8px' }}>
          <span onClick={() => navigate('/auth')} style={{ color: PRIMARY, cursor: 'pointer' }}>← Back</span>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
