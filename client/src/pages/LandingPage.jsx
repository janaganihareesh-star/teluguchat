import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';

const C = {
  GRADIENT: 'linear-gradient(135deg, #08071a 0%, #120e2e 50%, #080516 100%)',
  NAV_BG: 'rgba(15, 12, 41, 0.75)',
  CARD_BG: 'rgba(255, 255, 255, 0.05)',
  CARD_BORDER: 'rgba(255, 255, 255, 0.1)',
  PRIMARY: '#6366f1',
  GOLD: '#f59e0b',
  EMERALD: '#10b981',
  RED: '#ef4444'
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0 });
  const [activeFaq, setActiveFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchStats = () => {
      fetch('http://localhost:3500/api/stats')
        .then(r => r.json())
        .then(data => {
          if (data && typeof data.totalUsers === 'number') {
            setStats(data);
          }
        })
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    { q: 'How does Telugu Chat work?', a: 'It is completely free! Just click Enter The Chat, choose a registration method or enter as guest, pick a room, and start chatting with thousands of Telugu people worldwide in real-time.' },
    { q: 'How do you prevent spam and abuse?', a: 'We employ advanced Perspective AI text filtration and have active Telugu admins online 24/7. Any user sending vulgar content, offensive slurs, or spam links gets banned instantly.' },
    
    { q: 'What is the Guest Login restriction?', a: 'Guest mode lets you test the app instantly without an account. However, to prevent spam, guests cannot access private inboxes (DMs), upload images/voice files, .' }
  ];

  return (
    <div style={{ fontFamily: "'Segoe UI', Roboto, sans-serif", minHeight: '100vh', background: C.GRADIENT, color: '#f8fafc', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Background Floating Orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '-150px', width: '500px', height: '500px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '50%', filter: 'blur(120px)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '-150px', width: '450px', height: '450px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0, pointerEvents: 'none' }} />
      
      {/* Top Navbar */}
      <nav style={{ background: C.NAV_BG, backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.CARD_BORDER}`, padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Logo size={40} showText={true} />
          <span style={{ background: 'rgba(245,158,11,0.12)', border: `1px solid ${C.GOLD}`, color: C.GOLD, padding: '3px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 'bold', marginLeft: '6px' }}>OFFICIAL</span>
        </div>

        {/* Dynamic presence counter and action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.12)', border: `1px solid rgba(16,185,129,0.3)`, padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', color: C.EMERALD, fontWeight: 'bold' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: C.EMERALD, borderRadius: '50%', boxShadow: `0 0 8px ${C.EMERALD}`, animation: 'pulse 2s infinite' }} />
            {stats.onlineUsers || 0} Online
          </div>
          
          <button onClick={() => navigate('/auth')} style={{ background: `linear-gradient(135deg, ${C.GOLD}, #d97706)`, color: '#111827', border: 'none', borderRadius: '10px', padding: '8px 18px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 14px rgba(245,158,11,0.3)` }}>
            Start Chatting
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ position: 'relative', zIndex: 1, padding: '80px 20px', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.15)', border: `1px solid rgba(99,102,241,0.3)`, borderRadius: '30px', padding: '6px 16px', fontSize: '0.82rem', color: '#a5b4fc', fontWeight: 'bold', marginBottom: '24px' }}>
          ✨ Real-Time Telugu Messaging & Voice Rooms
        </div>
        
        <h1 style={{ fontSize: 'clamp(2.2rem, 6vw, 4.2rem)', fontWeight: '900', margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
          తెలుగు వాళ్ళతో<br />
          <span style={{ background: 'linear-gradient(90deg, #f59e0b, #fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 8px rgba(245,158,11,0.2))' }}>
            Real-Time Chat App
          </span>
        </h1>
        
        <p style={{ color: '#94a3b8', fontSize: '1.15rem', lineHeight: 1.6, marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          Join India's most vibrant online Telugu community. Real-time typing rooms, private end-to-end secure inboxes,  audio sharing, and live gaming rewards.
        </p>

        {/* Glowing Action Buttons */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/auth')} style={{ background: `linear-gradient(135deg, ${C.GOLD}, #d97706)`, color: '#111827', border: 'none', borderRadius: '50px', padding: '16px 40px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: `0 10px 30px rgba(245,158,11,0.35)`, transition: 'all 0.2s' }}>
            🚀 Enter The Chat
          </button>
          
          <button onClick={() => navigate('/auth')} style={{ background: 'rgba(255,255,255,0.06)', color: '#f8fafc', border: `1px solid ${C.CARD_BORDER}`, borderRadius: '50px', padding: '16px 40px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(8px)' }}>
            ⚡ Start The Chat
          </button>
        </div>
      </header>

      {/* Stats Counter Row */}
      <section style={{ position: 'relative', zIndex: 1, borderY: `1px solid ${C.CARD_BORDER}`, background: 'rgba(15,12,41,0.4)', padding: '24px 20px', display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap', backdropFilter: 'blur(8px)' }}>
        {[
          { v: stats.totalUsers !== undefined ? stats.totalUsers.toLocaleString() : '0', l: 'Registered Members' },
          { v: stats.onlineUsers !== undefined ? stats.onlineUsers.toLocaleString() : '0', l: 'Online Right Now' },
          { v: '24/7', l: 'Active AI Guard' },
          { v: '99.99%', l: 'Server Uptime' }
        ].map((item, idx) => (
          <div key={idx} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: C.GOLD, marginBottom: '2px' }}>{item.v}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.l}</div>
          </div>
        ))}
      </section>

      {/* Premium Features Cards */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '80px auto', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', marginBottom: '48px', color: '#fff' }}>
          🌟 App Features & Ecosystem
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {[
            { i: '⚡', t: 'Real-Time Messaging', d: 'Zero-latency WebSocket messaging with instant typing glows, pulsing active indicators, and offline reconnection.' },
            { i: '🏆', t: 'XP & Leveling System', d: 'Earn experience points for each message sent, level up your profile, and climb the public Telugu leaderboard!' },
            { i: '🛡️', t: 'Perspective AI Protection', d: 'Advanced AI and live administrators automatically mute, disconnect, or ban accounts posting spam or abuse.' },
            
            { i: '📩', t: 'Private Inbox (DMs)', d: 'Connect directly with individual users in secure private conversations with real-time dynamic delivery status.' },
            { i: '🎤', t: 'Voice & Media Options', d: 'Share audio notes, custom Telugu stickers, GIFs, photos, and fully responsive media uploads instantly.' }
          ].map((feat, idx) => (
            <div key={idx} style={{ background: C.CARD_BG, border: `1px solid ${C.CARD_BORDER}`, borderRadius: '20px', padding: '28px', transition: 'all 0.3s', backdropFilter: 'blur(8px)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', marginBottom: '20px', border: '1px solid rgba(99,102,241,0.25)' }}>
                {feat.i}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>{feat.t}</h3>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>{feat.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: '750px', margin: '80px auto', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', marginBottom: '40px', color: '#fff' }}>
          🤔 Frequently Asked Questions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.CARD_BORDER}`, borderRadius: '16px', overflow: 'hidden' }}>
                <button onClick={() => toggleFaq(idx)} style={{ width: '100%', padding: '18px 24px', background: 'none', border: 'none', outline: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', textAlign: 'left', color: '#fff' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>{faq.q}</span>
                  <span style={{ color: C.GOLD, fontSize: '1.2rem', transition: 'transform 0.2s', transform: isOpen ? 'rotate(45deg)' : 'none' }}>+</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 24px 20px', color: '#94a3b8', fontSize: '0.92rem', lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Community Rules Section */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '80px auto', padding: '0 24px' }}>
        <div style={{ background: 'rgba(245,158,11,0.05)', border: `1px solid rgba(245,158,11,0.2)`, borderRadius: '24px', padding: '40px 32px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 'bold', color: C.GOLD, marginBottom: '24px' }}>
            🛡️ Telugu Chat Rules & Guidelines
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', textAlign: 'left', margin: '0 auto', maxWidth: '650px' }}>
            {[
              { rule: 'No Abuse or Slurs', desc: 'Any form of target harassment or hate speech is strictly banned.' },
              { rule: 'Zero Spam/Promo Links', desc: 'Repeat messages and posting unrelated product links is filtered.' },
              { rule: 'No Vulgar/Adult Content', desc: 'Keep all discussions friendly, clean, and family-appropriate.' },
              { rule: 'Active Admin Moderation', desc: 'Perspective AI works alongside human moderators 24/7.' }
            ].map((ruleObj, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: C.GOLD, fontWeight: 'bold', fontSize: '1.2rem' }}>✓</span>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: 'bold', color: '#fff' }}>{ruleObj.rule}</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>{ruleObj.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{ position: 'relative', zIndex: 1, background: 'rgba(15,12,41,0.6)', borderTop: `1px solid ${C.CARD_BORDER}`, padding: '60px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
          Ready to join the community? 💬
        </h2>
        <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '1rem' }}>
          It's free, super fast, and runs directly in your browser.
        </p>
        <button onClick={() => navigate('/auth')} style={{ background: `linear-gradient(135deg, ${C.GOLD}, #d97706)`, color: '#111827', border: 'none', borderRadius: '50px', padding: '16px 48px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: `0 10px 30px rgba(245,158,11,0.3)` }}>
          Join Telugu Chat Now
        </button>
      </section>

      {/* Footer Links */}
      <footer style={{ background: '#05030c', borderTop: `1px solid ${C.CARD_BORDER}`, padding: '24px 20px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
        <span>© 2026 తెలుగు Chat. All Rights Reserved.</span>
        <span style={{ cursor: 'pointer', color: '#94a3b8' }}>Privacy Policy</span>
        <span style={{ cursor: 'pointer', color: '#94a3b8' }}>Terms of Service</span>
        <span style={{ cursor: 'pointer', color: '#94a3b8' }}>Support Desk</span>
      </footer>

    </div>
  );
};

export default LandingPage;
