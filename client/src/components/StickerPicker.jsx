import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STICKERS = {
  cute: [
    { name: 'Cute Cat', path: '/stickers/cute/cat.png' },
    { name: 'Playful Dog', path: '/stickers/cute/dog.png' },
    { name: 'Happy Panda', path: '/stickers/cute/panda.png' },
    { name: 'Cute Teddy', path: '/stickers/cute/teddy.png' },
    { name: 'Magical Unicorn', path: '/stickers/cute/unicorn.png' },
    { name: 'Cute Rabbit', path: '/stickers/cute/rabbit.png' },
    { name: 'Cute Monkey', path: '/stickers/cute/monkey.png' },
    { name: 'Cute Ghost', path: '/stickers/cute/ghost.png' },
    { name: 'Cute Pig', path: '/stickers/cute/pig.png' },
    { name: 'Cute Frog', path: '/stickers/cute/frog.png' },
    { name: 'Cute Chicken', path: '/stickers/cute/chicken.png' },
    { name: 'Cute Alien', path: '/stickers/cute/alien.png' },
    { name: 'Cute Fox', path: '/stickers/cute/fox.png' },
    { name: 'Cute Koala', path: '/stickers/cute/koala.png' },
    { name: 'Cute Lion', path: '/stickers/cute/lion.png' },
  ],
  love: [
    { name: 'Heart Eyes', path: '/stickers/love/heart_eyes.png' },
    { name: 'Gift Heart', path: '/stickers/love/heart_ribbon.png' },
    { name: 'Love Heart', path: '/stickers/love/red_heart.png' },
    { name: 'Blow Kiss', path: '/stickers/love/kiss.png' },
    { name: 'Growing Heart', path: '/stickers/love/growing_heart.png' },
    { name: 'Two Hearts', path: '/stickers/love/two_hearts.png' },
    { name: 'Heart Arrow', path: '/stickers/love/heart_arrow.png' },
    { name: 'Revolving Hearts', path: '/stickers/love/revolving_hearts.png' },
    { name: 'Sparkling Heart', path: '/stickers/love/sparkling_heart.png' },
    { name: 'Broken Heart', path: '/stickers/love/broken_heart.png' },
    { name: 'Love Letter', path: '/stickers/love/love_letter.png' },
    { name: 'Face with Hearts', path: '/stickers/love/face_hearts.png' },
  ],
  funny: [
    { name: 'Zany Face', path: '/stickers/funny/zany.png' },
    { name: 'Tears of Joy', path: '/stickers/funny/joy.png' },
    { name: 'Mindblown', path: '/stickers/funny/mindblown.png' },
    { name: 'Wink Tongue', path: '/stickers/funny/tongue.png' },
    { name: 'Party Popper', path: '/stickers/funny/party.png' },
    { name: 'ROFL Laughing', path: '/stickers/funny/rofl.png' },
    { name: 'Sweat Smile', path: '/stickers/funny/sweat_smile.png' },
    { name: 'Smirk Face', path: '/stickers/funny/smirk.png' },
    { name: 'Thinking Face', path: '/stickers/funny/thinking.png' },
    { name: 'Shushing Face', path: '/stickers/funny/shushing.png' },
    { name: 'Squint Smile', path: '/stickers/funny/squint_smile.png' },
    { name: 'Wink Face', path: '/stickers/funny/wink.png' },
    { name: 'Woozy Face', path: '/stickers/funny/woozy.png' },
    { name: 'Big Grin', path: '/stickers/funny/grin_big.png' },
    { name: 'Surprise Face', path: '/stickers/funny/surprise.png' },
    { name: 'Funny Clown', path: '/stickers/funny/clown.png' },
  ],
  sad: [
    // Cry / Sad
    { name: 'Sad Crying', path: '/stickers/sad/cry.png' },
    { name: 'Loudly Cry', path: '/stickers/sad/loud_cry.png' },
    { name: 'Pleading Face', path: '/stickers/sad/pleading.png' },
    { name: 'Holding Back Tears', path: '/stickers/sad/holding_back_tears.png' },
    { name: 'Frowning Sad', path: '/stickers/sad/frown.png' },
    { name: 'Disappointed Sad', path: '/stickers/sad/disappointed.png' },
    { name: 'Sad Relieved', path: '/stickers/sad/sad_relieved.png' },
    { name: 'Persevering Sad', path: '/stickers/sad/persevering.png' },
    { name: 'Worried Sad', path: '/stickers/sad/worried.png' },
    { name: 'Fearful Sad', path: '/stickers/sad/fearful.png' },
    { name: 'Downcast Sad', path: '/stickers/sad/downcast.png' },
    { name: 'Confounded Sad', path: '/stickers/sad/confounded.png' },
    { name: 'Astonished Sad', path: '/stickers/sad/astonished.png' },
    
    // Shy / Embarrassed
    { name: 'Shy Blush', path: '/stickers/sad/flushed.png' },
    { name: 'Shy Peeking', path: '/stickers/sad/peeking_eye.png' },
    { name: 'Shy Grimacing', path: '/stickers/sad/grimacing.png' },
    { name: 'Shy Anxious', path: '/stickers/sad/anxious.png' },
    
    // Dull / Sleepy / Sick
    { name: 'Pensive Dull', path: '/stickers/sad/pensive.png' },
    { name: 'Confused Dull', path: '/stickers/sad/confused.png' },
    { name: 'Sleepy Dull', path: '/stickers/sad/sleepy.png' },
    { name: 'Melting Dull', path: '/stickers/sad/melting.png' },
    { name: 'Neutral Dull', path: '/stickers/sad/neutral.png' },
    { name: 'Expressionless Dull', path: '/stickers/sad/expressionless.png' },
    { name: 'Sleeping Dull', path: '/stickers/sad/sleeping.png' },
    { name: 'Yawning Dull', path: '/stickers/sad/yawning.png' },
    { name: 'Tired Dull', path: '/stickers/sad/tired.png' },
    { name: 'Drooling Dull', path: '/stickers/sad/drooling.png' },
    { name: 'Weary Dull', path: '/stickers/sad/weary.png' },
    { name: 'Sneezing Sick', path: '/stickers/sad/sneezing.png' },
    { name: 'Vomiting Sick', path: '/stickers/sad/vomiting.png' },
    { name: 'Mask Sick', path: '/stickers/sad/mask.png' }
  ],
  telugu: [
    // Pawan Kalyan
    { name: 'Pawan Kalyan Action', path: '/stickers/telugu/pk_1.gif' },
    { name: 'Pawan Kalyan Style', path: '/stickers/telugu/pk_2.gif' },
    { name: 'Pawan Kalyan Attitude', path: '/stickers/telugu/pk_3.gif' },
    
    // Mahesh Babu
    { name: 'Mahesh Babu Smile', path: '/stickers/telugu/mahesh_1.gif' },
    { name: 'Mahesh Babu Reaction', path: '/stickers/telugu/mahesh_2.gif' },
    { name: 'Mahesh Babu Classy', path: '/stickers/telugu/mahesh_3.gif' },
    
    // Prabhas
    { name: 'Prabhas Darling', path: '/stickers/telugu/prabhas_1.gif' },
    { name: 'Prabhas Handsome', path: '/stickers/telugu/prabhas_2.gif' },
    { name: 'Prabhas Action', path: '/stickers/telugu/prabhas_3.gif' },
    
    // Jr NTR
    { name: 'Jr NTR Pride', path: '/stickers/telugu/ntr_1.gif' },
    { name: 'Jr NTR Angry', path: '/stickers/telugu/ntr_2.gif' },
    { name: 'Jr NTR Dance', path: '/stickers/telugu/ntr_3.gif' },
    
    // Allu Arjun
    { name: 'Allu Arjun Swag', path: '/stickers/telugu/allu_arjun_1.gif' },
    { name: 'Allu Arjun Thumbs', path: '/stickers/telugu/allu_arjun_2.gif' },
    { name: 'Allu Arjun Style', path: '/stickers/telugu/allu_arjun_3.gif' },
    
    // Ram Charan
    { name: 'Ram Charan Style', path: '/stickers/telugu/ram_charan_1.gif' },
    { name: 'Ram Charan Smile', path: '/stickers/telugu/ram_charan_2.gif' },
    { name: 'Ram Charan Action', path: '/stickers/telugu/ram_charan_3.gif' },
    
    // Chiranjeevi
    { name: 'Chiranjeevi Grace', path: '/stickers/telugu/chiranjeevi_1.gif' },
    { name: 'Chiranjeevi Laugh', path: '/stickers/telugu/chiranjeevi_2.gif' },
    { name: 'Chiranjeevi Dance', path: '/stickers/telugu/chiranjeevi_3.gif' },
    
    // Balakrishna
    { name: 'Balayya Punch', path: '/stickers/telugu/balayya_1.gif' },
    { name: 'Balayya Smile', path: '/stickers/telugu/balayya_2.gif' },
    { name: 'Balayya Style', path: '/stickers/telugu/balayya_3.gif' },
    
    // Venkatesh
    { name: 'Venkatesh Funny', path: '/stickers/telugu/venky_1.gif' },
    { name: 'Venkatesh Smile', path: '/stickers/telugu/venky_2.gif' },
    { name: 'Venkatesh Laugh', path: '/stickers/telugu/venky_3.gif' },
    
    // Nani
    { name: 'Nani Natural', path: '/stickers/telugu/nani_1.gif' },
    { name: 'Nani Smile', path: '/stickers/telugu/nani_2.gif' },
    { name: 'Nani Reaction', path: '/stickers/telugu/nani_3.gif' },
    
    // Brahmanandam (12 stickers)
    { name: 'Brahmi Laughing', path: '/stickers/telugu/brahmi_1.gif' },
    { name: 'Brahmi Shocked', path: '/stickers/telugu/brahmi_2.gif' },
    { name: 'Brahmi Comedy', path: '/stickers/telugu/brahmi_3.gif' },
    { name: 'Brahmi Dance', path: '/stickers/telugu/brahmi_4.gif' },
    { name: 'Brahmi Attarintiki', path: '/stickers/telugu/brahmi_5.gif' },
    { name: 'Brahmi Sandeep', path: '/stickers/telugu/brahmi_6.gif' },
    { name: 'Brahmi Blush', path: '/stickers/telugu/brahmi_7.gif' },
    { name: 'Brahmi Star Tamil', path: '/stickers/telugu/brahmi_8.gif' },
    { name: 'Brahmi Venky', path: '/stickers/telugu/brahmi_9.gif' },
    { name: 'Brahmi Crown', path: '/stickers/telugu/brahmi_10.gif' },
    { name: 'Brahmi Serious', path: '/stickers/telugu/brahmi_11.gif' },
    { name: 'Brahmi Fun', path: '/stickers/telugu/brahmi_12.gif' },
    
    // Sunil (4 stickers)
    { name: 'Sunil Funny', path: '/stickers/telugu/sunil_1.gif' },
    { name: 'Sunil Expression', path: '/stickers/telugu/sunil_2.gif' },
    { name: 'Sunil Laugh', path: '/stickers/telugu/sunil_3.gif' },
    { name: 'Sunil Shock', path: '/stickers/telugu/sunil_4.gif' },
    
    // MS Narayana (4 stickers)
    { name: 'MS Narayana Drink', path: '/stickers/telugu/ms_1.gif' },
    { name: 'MS Narayana Romantic', path: '/stickers/telugu/ms_2.gif' },
    { name: 'MS Narayana Shock', path: '/stickers/telugu/ms_3.gif' },
    { name: 'MS Narayana Fun', path: '/stickers/telugu/ms_4.gif' },
    
    // Ali (4 stickers)
    { name: 'Ali Reaction', path: '/stickers/telugu/ali_1.gif' },
    { name: 'Ali Smile', path: '/stickers/telugu/ali_2.gif' },
    { name: 'Ali Comedy', path: '/stickers/telugu/ali_3.gif' },
    { name: 'Ali Laugh', path: '/stickers/telugu/ali_4.gif' },
    
    // Babu Mohan (4 stickers)
    { name: 'Babu Mohan Face', path: '/stickers/telugu/babu_1.gif' },
    { name: 'Babu Mohan Expression', path: '/stickers/telugu/babu_2.gif' },
    { name: 'Babu Mohan Comedy', path: '/stickers/telugu/babu_3.gif' },
    { name: 'Babu Mohan Laugh', path: '/stickers/telugu/babu_4.gif' },
  ]
};

const StickerPicker = ({ onStickerSelect }) => {
  const [activeTab, setActiveTab] = useState('telugu'); // Default to Telugu as requested
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'telugu', label: 'Telugu 🎬', color: 'border-blue-500 text-blue-600' },
    { id: 'cute', label: 'Cute 🐼', color: 'border-emerald-500 text-emerald-600' },
    { id: 'love', label: 'Love 💖', color: 'border-pink-500 text-pink-600' },
    { id: 'funny', label: 'Funny 😂', color: 'border-amber-500 text-amber-600' },
    { id: 'sad', label: 'Sad/Shy 😢', color: 'border-purple-500 text-purple-600' },
  ];

  // Get displayed stickers based on active category or search query
  const getDisplayedStickers = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return STICKERS[activeTab] || [];
    }

    // Search across all categories if query is provided
    let results = [];
    Object.keys(STICKERS).forEach(cat => {
      const filtered = STICKERS[cat].filter(st => 
        st.name.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
      );
      results = [...results, ...filtered];
    });
    return results;
  };

  const displayedStickers = getDisplayedStickers();

  return (
    <div className="absolute bottom-full mb-3 w-80 h-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl z-50 flex flex-col p-3 border border-slate-100/90 transition-all duration-300">
      {/* Search Input */}
      <div className="relative mb-2">
        <input 
          type="text" 
          placeholder="Search stickers..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:border-indigo-400 focus:bg-white p-2.5 rounded-xl text-slate-800 focus:outline-none placeholder-slate-400 text-xs transition duration-200"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-bold bg-transparent border-none cursor-pointer"
          >
            ×
          </button>
        )}
      </div>

      {/* Categories Tabs */}
      {!searchQuery && (
        <div className="flex gap-1 border-b border-slate-100 pb-2 mb-2 justify-between">
          {categories.map(cat => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`text-[11px] font-bold px-2 py-1.5 rounded-lg border-0 cursor-pointer transition-all duration-300 relative flex items-center gap-1 ${
                  isActive 
                    ? 'bg-slate-100 text-indigo-600 font-extrabold shadow-sm' 
                    : 'bg-transparent text-slate-500 hover:bg-slate-50'
                }`}
              >
                {cat.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Grid Container */}
      <div className="flex-1 overflow-y-auto pr-1">
        {displayedStickers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-10">
            <span className="text-xl mb-1">🐼</span>
            <span>No stickers found</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <AnimatePresence>
              {displayedStickers.map((sticker, idx) => (
                <motion.div
                  key={sticker.path}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.2) }}
                  onClick={() => onStickerSelect(sticker.path)}
                  className="w-full aspect-square bg-slate-50/70 border border-slate-100/50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-100 hover:scale-105 hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md transition-all duration-200 p-1 select-none"
                  title={sticker.name}
                >
                  <img 
                    src={sticker.path} 
                    alt={sticker.name}
                    className="w-full h-full object-contain max-h-16"
                    loading="lazy"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default StickerPicker;
