import React from 'react';

const LevelTag = ({ level }) => {
  let colorClass = 'bg-gray-600 text-gray-200';
  
  if (level >= 100) {
    colorClass = 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold';
  } else if (level >= 75) {
    colorClass = 'bg-teal-600 text-white';
  } else if (level >= 50) {
    colorClass = 'bg-purple-600 text-white';
  } else if (level >= 23) {
    colorClass = 'bg-blue-600 text-white';
  }

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full ${colorClass}`}>
      Lv.{level}
    </span>
  );
};

export default LevelTag;
