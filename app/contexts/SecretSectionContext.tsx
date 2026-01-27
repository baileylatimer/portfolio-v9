import React, { createContext, useContext, useState } from 'react';

interface SecretSectionContextType {
  isSecretSectionOpen: boolean;
  openSecretSection: () => void;
  closeSecretSection: () => void;
}

const SecretSectionContext = createContext<SecretSectionContextType | undefined>(undefined);

export const useSecretSection = () => {
  const context = useContext(SecretSectionContext);
  if (context === undefined) {
    throw new Error('useSecretSection must be used within a SecretSectionProvider');
  }
  return context;
};

export const SecretSectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSecretSectionOpen, setIsSecretSectionOpen] = useState(false);

  const openSecretSection = () => {
    console.log("Opening secret section via context");
    setIsSecretSectionOpen(true);
  };

  const closeSecretSection = () => {
    console.log("Closing secret section via context");
    setIsSecretSectionOpen(false);
  };

  return (
    <SecretSectionContext.Provider value={{
      isSecretSectionOpen,
      openSecretSection,
      closeSecretSection,
    }}>
      {children}
    </SecretSectionContext.Provider>
  );
};