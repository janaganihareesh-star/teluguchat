import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(() => {
    return !localStorage.getItem('cookieAccepted');
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { pathname } = useLocation();

  useEffect(() => {

    // Handle screen resize for mobile responsiveness
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieAccepted', 'true');
    setIsVisible(false);
  };

  // Only show on authentication-related pages (like /auth, /login, /register)
  // and explicitly hide on the Landing Page (/)
  const isAuthPage = ['/auth', '/login', '/register'].includes(pathname);

  if (!isVisible || !isAuthPage) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: isMobile ? '16px' : '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '800px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.18)',
        padding: isMobile ? '18px' : '20px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: isMobile ? '16px' : '24px',
        zIndex: 9999,
        border: '1px solid rgba(0, 0, 0, 0.05)',
        fontFamily: "'Segoe UI', Roboto, sans-serif"
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center', 
          gap: isMobile ? '14px' : '20px' 
        }}
      >
        {/* Cookie Icon SVG */}
        <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <circle cx="32" cy="32" r="28" fill="#F4B874"/>
          <circle cx="20" cy="40" r="14" fill="#A5734D"/>
          {/* Chocolate chips */}
          <circle cx="28" cy="20" r="3" fill="#8C5A35"/>
          <circle cx="42" cy="28" r="4" fill="#8C5A35"/>
          <circle cx="36" cy="42" r="3" fill="#8C5A35"/>
          <circle cx="24" cy="50" r="2" fill="#5C3A21"/>
          <circle cx="14" cy="42" r="3" fill="#5C3A21"/>
          <circle cx="18" cy="32" r="2.5" fill="#5C3A21"/>
          <circle cx="48" cy="40" r="2.5" fill="#8C5A35"/>
          <circle cx="40" cy="16" r="2" fill="#8C5A35"/>
          <circle cx="16" cy="24" r="2" fill="#8C5A35"/>
        </svg>

        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#1e293b', fontWeight: 'bold' }}>
            About cookies we use
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.45' }}>
            We use cookies to provide necessary website functionality, such as allowing your device to remain logged in. By using our website, you agree to this and agree to our <a href="#" style={{ color: '#4f46e5', textDecoration: 'underline', fontWeight: '500' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>

      <button 
        onClick={handleAccept}
        style={{
          background: '#ec4899', 
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          padding: isMobile ? '12px' : '10px 32px',
          width: isMobile ? '100%' : 'auto',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(236, 72, 153, 0.35)',
          transition: 'all 0.2s',
          textAlign: 'center'
        }}
        onMouseOver={e => e.currentTarget.style.background = '#db2777'}
        onMouseOut={e => e.currentTarget.style.background = '#ec4899'}
      >
        OK
      </button>
    </div>
  );
};

export default CookieBanner;
