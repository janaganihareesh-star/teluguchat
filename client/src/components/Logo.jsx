import React from 'react';

// Custom SVG Logo for "Telugu Chat" — stylized TC in speech bubble
const Logo = ({ size = 36, showText = true, header = false }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Speech bubble shape */}
      <rect width="40" height="32" rx="10" fill="url(#logoGrad)" />
      <polygon points="6,32 14,32 6,40" fill="url(#logoGrad)" />
      {/* Letter T stylized */}
      <text x="20" y="23" fontFamily="Arial Black, sans-serif" fontSize="17" fontWeight="900" fill="white" textAnchor="middle" letterSpacing="-1">
        తచ
      </text>
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="50%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
    </svg>
    {showText && (
      <div style={{ lineHeight: 1.1 }} className="flex items-center">
        <span 
          className="font-black text-xs sm:text-lg"
          style={
            header 
              ? { color: '#ffffff' }
              : { background: 'linear-gradient(90deg, #4f46e5, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
          }
        >
          తెలుగు
        </span>
        <span className="font-bold text-xs sm:text-lg text-amber-500">Chat</span>
      </div>
    )}
  </div>
);

export default Logo;
