import React, { useState, useEffect } from 'react';

const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already accepted cookies
    const cookieAccepted = localStorage.getItem('cookieAccepted');
    if (!cookieAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieAccepted', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '800px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        zIndex: 9999,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1e293b', fontWeight: 'bold' }}>
            About cookies we use
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
            We uses cookies to provide necessary website functionality, such as allowing your device to be logged in. By using our website, you agree to this and agree to our <a href="#" style={{ color: '#475569', textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
        </div>
      </div>

      <button 
        onClick={handleAccept}
        style={{
          background: '#ec4899', // Pink button to match the image
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 32px',
          fontSize: '0.9rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.2s'
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
