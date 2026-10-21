import { useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './ThemeContext';

const THEME_STORAGE_KEY = 'pakverify-theme';

function getSavedTheme() {
  try {
    const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return theme === 'light' || theme === 'dark' ? theme : null;
  } catch {
    return null;
  }
}

function getInitialTheme() {
  return getSavedTheme()
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [hasExplicitTheme, setHasExplicitTheme] = useState(() => getSavedTheme() !== null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    if (hasExplicitTheme) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Theme selection still applies for this page when storage is unavailable.
      }
    }
  }, [theme, hasExplicitTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateFromSystem = (event) => {
      if (!hasExplicitTheme) setTheme(event.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', updateFromSystem);
    return () => mediaQuery.removeEventListener('change', updateFromSystem);
  }, [hasExplicitTheme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => {
        setHasExplicitTheme(true);
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
