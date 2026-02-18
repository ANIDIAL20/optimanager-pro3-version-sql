'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Mode = 'basique' | 'expert';

interface ModeContextType {
  mode: Mode;
  toggleMode: () => void;
  isBasicMode: boolean;
  isExpertMode: boolean;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('basique'); // Default: Basique

  // Load from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('user-mode') as Mode;
    if (savedMode && (savedMode === 'basique' || savedMode === 'expert')) {
      setMode(savedMode);
    }
  }, []);

  const toggleMode = () => {
    const newMode = mode === 'basique' ? 'expert' : 'basique';
    setMode(newMode);
    localStorage.setItem('user-mode', newMode);
  };

  return (
    <ModeContext.Provider
      value={{
        mode,
        toggleMode,
        isBasicMode: mode === 'basique',
        isExpertMode: mode === 'expert',
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export const useMode = () => {
  const context = useContext(ModeContext);
  if (!context) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return context;
};
