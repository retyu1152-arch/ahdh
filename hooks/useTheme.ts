
import { useEffect, useState } from 'react';
import { dbService } from '../services/dbService';

export type Theme = 'light' | 'dark' | 'auto';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('auto');

  useEffect(() => {
    let isMounted = true;
    dbService.get<Theme>('theme').then(savedTheme => {
      if (isMounted && savedTheme) {
        setThemeState(savedTheme);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    dbService.set('theme', newTheme);
  };


  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (newTheme: Theme) => {
      root.classList.remove('light', 'dark');
      let effectiveTheme = newTheme;
      
      if (newTheme === 'auto') {
        const hour = new Date().getHours();
        // Dark theme from 6 PM (18) to 6 AM (5)
        const isNight = hour >= 18 || hour < 6;
        effectiveTheme = isNight ? 'dark' : 'light';
      }
      
      root.classList.add(effectiveTheme);
      // For tailwind config
      root.classList.toggle('dark', effectiveTheme === 'dark');
    };
    
    applyTheme(theme);

    let intervalId: number | undefined;
    if (theme === 'auto') {
      intervalId = window.setInterval(() => {
        applyTheme('auto');
      }, 60000); // Check every minute
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };

  }, [theme]);

  return [theme, setTheme] as const;
}
