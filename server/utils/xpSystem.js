const getXpThresholdForLevel = (level) => {
  // Level 1: 0, Level 2: 1000, Level 3: 3000, Level 4: 6000...
  return (level * (level - 1) / 2) * 1000;
};

const calculateLevel = (xp) => {
  if (xp < 1000) return 1;
  
  let currentLevel = 1;
  
  while (true) {
    const nextLevel = currentLevel + 1;
    const nextThreshold = getXpThresholdForLevel(nextLevel);
    
    if (xp < nextThreshold) {
      return currentLevel;
    }
    currentLevel++;
  }
};

const getBadge = (level, gender) => {
  if (level >= 100) {
    return gender === 'male' ? 'king' : 'queen';
  }
  if (level >= 75) return 'diamond_animated';
  if (level >= 50) return 'diamond';
  if (level >= 23) return 'gold_tick';
  return 'none';
};

module.exports = { calculateLevel, getBadge, getXpThresholdForLevel };
