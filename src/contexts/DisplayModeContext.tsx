import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type DisplayMode = 'expert' | 'guided';

interface DisplayModeContextValue {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  isGuided: boolean;
}

const DisplayModeContext = createContext<DisplayModeContextValue | null>(null);

export const DisplayModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [displayMode, setDisplayModeState] = useState<DisplayMode>(() => {
    const stored = localStorage.getItem('stintlab-display-mode');
    return stored === 'guided' ? 'guided' : 'expert';
  });

  const setDisplayMode = useCallback((mode: DisplayMode) => {
    setDisplayModeState(mode);
    localStorage.setItem('stintlab-display-mode', mode);
  }, []);

  const value = useMemo(() => ({
    displayMode,
    setDisplayMode,
    isGuided: displayMode === 'guided',
  }), [displayMode, setDisplayMode]);

  return <DisplayModeContext.Provider value={value}>{children}</DisplayModeContext.Provider>;
};

export const useDisplayMode = (): DisplayModeContextValue => {
  const ctx = useContext(DisplayModeContext);
  if (!ctx) throw new Error('useDisplayMode must be used within DisplayModeProvider');
  return ctx;
};
