import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

export const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'theme-dark';
  });

  useEffect(() => {
    localStorage.setItem('appTheme', theme);
    
    // Clean up old theme classes
    document.documentElement.classList.forEach(className => {
      if (className.startsWith('theme-')) {
        document.documentElement.classList.remove(className);
      }
    });
    
    // Apply new theme class
    document.documentElement.classList.add(theme);
    
    // Also toggle Tailwind's native dark class for generic compat
    if (['theme-dark', 'theme-cody', 'theme-sad'].includes(theme)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const changeTheme = useCallback((newTheme) => setTheme(newTheme), []);

  const value = useMemo(() => ({ theme, changeTheme }), [theme, changeTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
