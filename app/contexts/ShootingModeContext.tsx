import React, { createContext, useContext, useState, useCallback } from 'react';

interface ShootingModeContextType {
  isShootingMode: boolean;
  toggleShootingMode: () => void;
  enableShootingMode: () => void;
  disableShootingMode: () => void;
}

const ShootingModeContext = createContext<ShootingModeContextType | undefined>(undefined);

export const useShootingMode = () => {
  const context = useContext(ShootingModeContext);
  if (context === undefined) {
    throw new Error('useShootingMode must be used within a ShootingModeProvider');
  }
  return context;
};

export const ShootingModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isShootingMode, setIsShootingMode] = useState(false);

  const toggleShootingMode = useCallback(() => {
    const newMode = !isShootingMode;
    setIsShootingMode(newMode);
    
    // Update document cursor
    if (newMode) {
      document.body.classList.add('shooting-mode');
      console.log('🔫 Shooting mode ENABLED');
    } else {
      document.body.classList.remove('shooting-mode');
      console.log('🔫 Shooting mode DISABLED');
    }
  }, [isShootingMode]);

  const enableShootingMode = useCallback(() => {
    setIsShootingMode(true);
    document.body.classList.add('shooting-mode');
    console.log('🔫 Shooting mode ENABLED');
  }, []);

  const disableShootingMode = useCallback(() => {
    setIsShootingMode(false);
    document.body.classList.remove('shooting-mode');
    console.log('🔫 Shooting mode DISABLED');
  }, []);

  return (
    <ShootingModeContext.Provider value={{
      isShootingMode,
      toggleShootingMode,
      enableShootingMode,
      disableShootingMode,
    }}>
      {children}
    </ShootingModeContext.Provider>
  );
};