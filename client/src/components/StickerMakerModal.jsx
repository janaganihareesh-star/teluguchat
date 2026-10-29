import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaUpload, FaMagic, FaFont, FaCheck, FaDownload, FaCrop, FaTrashAlt } from 'react-icons/fa';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const MEME_TEMPLATES = [
  { name: 'Brahmanandam Shock', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' },
  { name: 'Laughing Vibe', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { name: 'Cool Swagger', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80' }
];

const TELUGU_PUNCHLINES = [
  "Enti Comedy ah? 😂",
  "Babu Chitti... 👶",
  "Thaggede Le! 🔥",
  "Mind Block Aindi 🤯",
  "Adirindi Guru! ✨",
  "Evarra Meerantha? 🧐",
  "Arey entra idi 🤦‍♂️",
  "Jai Balayya! 🦁",
  "Choodu brother! 👀",
  "Next level anthe! 🚀"
];

const StickerMakerModal = ({ isOpen, onClose, onStickerCreated }) => {
  const { user, token, updateUser } = useContext(AuthContext);
  const canvasRef = useRef(null);
  
  const [imageSrc, setImageSrc] = useState(null);
  const [cropShape, setCropShape] = useState('rounded'); // 'rounded', 'circle', 'square'
  const [memeText, setMemeText] = useState('Thaggede Le! 🔥');
  const [textPosition, setTextPosition] = useState('bottom'); // 'top', 'center', 'bottom'
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(26);
  const [transparentBg, setTransparentBg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Handle local image file upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Re-draw canvas whenever any state changes
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 320;
    const height = 320;

    ctx.clearRect(0, 0, width, height);

    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();

        // 1. Apply clipping path according to cropShape
        if (cropShape === 'circle') {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, width / 2 - 8, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        } else if (cropShape === 'rounded') {
          const radius = 32;
          ctx.beginPath();
          ctx.moveTo(8 + radius, 8);
          ctx.lineTo(width - 8 - radius, 8);
          ctx.quadraticCurveTo(width - 8, 8, width - 8, 8 + radius);
          ctx.lineTo(width - 8, height - 8 - radius);
          ctx.quadraticCurveTo(width - 8, height - 8, width - 8 - radius, height - 8);
          ctx.lineTo(8 + radius, height - 8);
          ctx.quadraticCurveTo(8, height - 8, 8, height - 8 - radius);
          ctx.lineTo(8, 8 + radius);
          ctx.quadraticCurveTo(8, 8, 8 + radius, 8);
          ctx.closePath();
          ctx.clip();
        }

        // Draw image cover-fit into 320x320
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Optional background color removal (sample top-left pixel)
        if (transparentBg) {
          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            const targetR = data[0];
            const targetG = data[1];
            const targetB = data[2];
            const tolerance = 40;

            for (let i = 0; i < data.length; i += 4) {
              const rDiff = Math.abs(data[i] - targetR);
              const gDiff = Math.abs(data[i + 1] - targetG);
              const bDiff = Math.abs(data[i + 2] - targetB);
              if (rDiff < tolerance && gDiff < tolerance && bDiff < tolerance) {
                data[i + 3] = 0; // Transparent
              }
            }
            ctx.putImageData(imgData, 0, 0);
          } catch (e) {
            console.warn('Canvas pixel manipulation error:', e);
          }
        }

        ctx.restore();

        // 2. Render Meme Punch Text
        if (memeText.trim()) {
          ctx.save();
          ctx.font = `bold ${fontSize}px "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#000000';
          ctx.fillStyle = textColor;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
          ctx.shadowBlur = 6;

          let textY = height - 24;
          if (textPosition === 'top') textY = 42;
          else if (textPosition === 'center') textY = height / 2 + 8;

          // Multi-line wrap helper
          const words = memeText.split(' ');
          let line = '';
          const lines = [];
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > width - 30 && n > 0) {
              lines.push(line);
              line = words[n] + ' ';
            } else {
              line = testLine;
            }
          }
          lines.push(line);

          lines.forEach((l, idx) => {
            const curY = textY + (idx * (fontSize + 4));
            ctx.strokeText(l.trim(), width / 2, curY);
            ctx.fillText(l.trim(), width / 2, curY);
          });

          ctx.restore();
        }
      };
      img.src = imageSrc;
    } else {
      // Empty canvas guide
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Upload a photo or pick a meme below', width / 2, height / 2);
    }
  }, [isOpen, imageSrc, cropShape, memeText, textPosition, textColor, fontSize, transparentBg]);

  // Save Sticker to Server & Add to User Tray
  const handleSaveAndUse = async (shouldSendDirectly = true) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) {
      alert('Please select an image first!');
      return;
    }

    setIsSaving(true);
    setStatusMsg('Creating sticker...');

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSaving(false);
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, `sticker_${Date.now()}.png`);

        // Upload to server
        const uploadRes = await api.post('/api/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });

        const stickerUrl = uploadRes.data.url;

        // Save to user custom stickers tray
        await api.post('/api/users/upload-sticker', { stickerUrl }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Update local user state
        if (user) {
          const updatedCustom = [...(user.customStickers || []), stickerUrl];
          updateUser?.({ ...user, customStickers: updatedCustom });
        }

        setIsSaving(false);
        setStatusMsg('✅ Sticker created!');

        if (shouldSendDirectly && onStickerCreated) {
          onStickerCreated(stickerUrl);
          onClose();
        } else {
          setTimeout(() => {
            setStatusMsg('');
            onClose();
          }, 800);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Error saving sticker:', err);
      setIsSaving(false);
      setStatusMsg('Failed to save sticker.');
    }
  };

  // Download directly to device
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `telugu_sticker_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col p-6 text-white"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black bg-gradient-to-r from-indigo-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                🎨 Telugu Sticker Maker
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Mee sontha meme stickers create chesi chats lo send cheyandi!</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition"
            >
              <FaTimes />
            </button>
          </div>

          {/* Body Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
            
            {/* Left: Canvas Preview */}
            <div className="flex flex-col items-center">
              <div className="relative p-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
                {/* Transparency pattern background */}
                <div 
                  className="w-80 h-80 rounded-xl overflow-hidden shadow-md flex items-center justify-center relative"
                  style={{
                    backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                >
                  <canvas ref={canvasRef} width={320} height={320} className="w-full h-full block" />
                </div>
              </div>

              {/* Action Buttons below preview */}
              <div className="flex gap-2 mt-4 w-full">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!imageSrc}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <FaDownload /> Download
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAndUse(true)}
                  disabled={!imageSrc || isSaving}
                  className="flex-2 bg-gradient-to-r from-indigo-500 to-pink-600 hover:from-indigo-600 hover:to-pink-700 disabled:opacity-40 text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 transition"
                >
                  <FaCheck /> {isSaving ? 'Saving...' : 'Save & Send to Chat'}
                </button>
              </div>
              {statusMsg && (
                <div className="text-xs text-emerald-400 font-bold mt-2 text-center animate-pulse">
                  {statusMsg}
                </div>
              )}
            </div>

            {/* Right: Controls & Presets */}
            <div className="flex flex-col gap-4 overflow-y-auto pr-1">
              
              {/* Upload image button */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  1. Select Photo / Meme
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-slate-800 hover:bg-slate-700 border border-dashed border-indigo-400/50 hover:border-indigo-400 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-indigo-300 transition">
                    <FaUpload /> Upload Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {imageSrc && (
                    <button
                      type="button"
                      onClick={() => setImageSrc(null)}
                      className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition text-xs"
                      title="Clear photo"
                    >
                      <FaTrashAlt />
                    </button>
                  )}
                </div>
              </div>

              {/* Crop & Transparency */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  2. Shape & Cutout
                </label>
                <div className="flex gap-2">
                  {['rounded', 'circle', 'square'].map(shape => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setCropShape(shape)}
                      className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition border ${
                        cropShape === shape 
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setTransparentBg(!transparentBg)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                      transparentBg 
                        ? 'bg-emerald-600 border-emerald-400 text-white' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                    }`}
                    title="Toggle auto transparent background"
                  >
                    <FaMagic /> Cutout
                  </button>
                </div>
              </div>

              {/* Telugu Punchline Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  3. Telugu Punchlines (Quick Pick)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                  {TELUGU_PUNCHLINES.map(punch => (
                    <button
                      key={punch}
                      type="button"
                      onClick={() => setMemeText(punch)}
                      className={`text-[11px] font-semibold py-1 px-2.5 rounded-lg border transition ${
                        memeText === punch 
                          ? 'bg-pink-600 border-pink-400 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {punch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Meme Text Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Custom Text
                </label>
                <input
                  type="text"
                  value={memeText}
                  onChange={(e) => setMemeText(e.target.value)}
                  placeholder="Type your Telugu text here..."
                  className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-400 p-2.5 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              {/* Text Position & Style */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Position
                  </label>
                  <div className="flex gap-1">
                    {['top', 'center', 'bottom'].map(pos => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setTextPosition(pos)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg capitalize border ${
                          textPosition === pos 
                            ? 'bg-indigo-600 border-indigo-400 text-white' 
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Color
                  </label>
                  <div className="flex gap-1.5 items-center">
                    {['#FFFFFF', '#FACC15', '#EF4444', '#38BDF8', '#4ADE80'].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTextColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          textColor === c ? 'border-white scale-110 shadow' : 'border-transparent opacity-80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Font Size Slider */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 font-bold mb-1">
                  <span>Font Size</span>
                  <span>{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="44"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StickerMakerModal;

