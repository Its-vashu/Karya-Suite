import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark, system } from './themes';

const THEME_KEY = '@app_theme_pref_v1';

const ThemeContext = createContext({
  theme: light,
  mode: 'light',
  setMode: () => {},
  toggle: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [mode, setModeState] = useState('light');
  const [theme, setTheme] = useState(light);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_KEY);
        const m = stored || 'light';
        setModeState(m);
      } catch (e) {
        console.warn('Failed to load theme', e);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const apply = () => {
      if (mode === 'dark') setTheme(dark);
      else if (mode === 'light') setTheme(light);
      else if (mode === system) {
        const colorScheme = Appearance.getColorScheme();
        setTheme(colorScheme === 'dark' ? dark : light);
      }
    };
    apply();
  }, [mode]);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => {
      if (mode === system) {
        const colorScheme = Appearance.getColorScheme();
        setTheme(colorScheme === 'dark' ? dark : light);
      }
    });
    return () => sub.remove();
  }, [mode]);

  const setMode = async (m) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, m);
      setModeState(m);
    } catch (e) {
      console.warn('Failed to persist theme', e);
    }
  };

  const toggle = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
