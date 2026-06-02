import React, { useState, useRef, useEffect } from 'react';

const ImageLightbox = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef(null);

  // Esc key closes lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      });
      setIsDragging(scale === 1); // Drag to close only when not zoomed in
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || scale > 1) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStart.y;
    setTranslateY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(translateY) > 120) {
      // Swiped enough, close!
      onClose();
    } else {
      // Snap back
      setTranslateY(0);
    }
  };

  const handleDoubleTap = (e) => {
    e.preventDefault();
    if (scale === 1) {
      setScale(2.2);
    } else {
      setScale(1);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0.4, 0.95 - Math.abs(translateY) / 1000)})`,
        backdropFilter: 'blur(20px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        touchAction: 'none',
        transition: isDragging ? 'none' : 'background-color 0.3s ease',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with Close Button */}
      <div
        style={{
          position: 'absolute',
          top: 'env(safe-area-inset-top, 16px)',
          right: '16px',
          zIndex: 10000,
          display: 'flex',
          gap: '12px',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
        >
          ✕
        </button>
      </div>

      {/* Main Image Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: scale > 1 ? 'zoom-out' : 'zoom-in',
          maxWidth: '90%',
          maxHeight: '80%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onDoubleClick={handleDoubleTap}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Zoomed attachment"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            borderRadius: '16px',
            objectFit: 'contain',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            pointerEvents: 'auto',
          }}
        />
      </div>

      {/* Floating Instructions */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.8rem',
          fontWeight: '500',
          padding: '8px 16px',
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none',
        }}
      >
        Double tap to zoom • Drag up/down to close
      </div>
    </div>
  );
};

export default ImageLightbox;
