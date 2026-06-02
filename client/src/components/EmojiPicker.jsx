import Picker from 'emoji-picker-react';

const EmojiPickerCmp = ({ onEmojiSelect, className }) => {
  return (
    <div className={className !== undefined ? className : "absolute bottom-full mb-2 bg-white rounded-lg shadow-xl z-50"}>
      <Picker 
        onEmojiClick={(emojiObject) => onEmojiSelect(emojiObject.emoji)} 
        theme="light" 
      />
    </div>
  );
};

export default EmojiPickerCmp;
