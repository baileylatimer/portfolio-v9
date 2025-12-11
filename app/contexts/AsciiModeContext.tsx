import React, { createContext, useState, useContext } from 'react';

interface AsciiModeContextType {
  asciiMode: boolean;
  toggleAsciiMode: () => void;
}

const AsciiModeContext = createContext<AsciiModeContextType>({
  asciiMode: false,
  toggleAsciiMode: () => {},
});

export const AsciiModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [asciiMode, setAsciiMode] = useState(false);
  
  const toggleAsciiMode = () => {
    console.log('Toggling ASCII mode');
    setAsciiMode(prev => !prev);
  };
  
  return (
    <AsciiModeContext.Provider value={{ asciiMode, toggleAsciiMode }}>
      {children}
    </AsciiModeContext.Provider>
  );
};

export const useAsciiMode = () => useContext(AsciiModeContext);
