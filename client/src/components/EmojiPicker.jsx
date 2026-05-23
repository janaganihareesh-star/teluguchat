import React from 'react';
import Picker from 'emoji-picker-react';

const EmojiPickerCmp = ({ onEmojiSelect }) => {
  return (
    <div className="absolute bottom-full mb-2 bg-white rounded-lg shadow-xl z-50">
      <Picker 
        onEmojiClick={(emojiObject) => onEmojiSelect(emojiObject.emoji)} 
        theme="light" 
      />
    </div>
  );
};

export default EmojiPickerCmp;
