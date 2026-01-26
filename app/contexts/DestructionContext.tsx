import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface DestructionState {
  // Track destroyed elements by their unique IDs
  destroyedWords: Set<string>;     // "word-mission-5", "word-about-12", etc.
  destroyedImages: Set<string>;    // "image-hero-bg", "image-project-456", etc.
  
  // Derived state
  hasDestruction: boolean;         // Any destruction occurred?
  
  // Actions
  destroyWord: (id: string) => void;
  destroyImage: (id: string) => void;
  repairWord: (id: string) => void;
  repairImage: (id: string) => void;
  repairAll: () => void;         // Reset everything!
  
  // Getters
  isWordDestroyed: (id: string) => boolean;
  isImageDestroyed: (id: string) => boolean;
}

const DestructionContext = createContext<DestructionState | undefined>(undefined);

interface DestructionProviderProps {
  children: ReactNode;
}

export const DestructionProvider: React.FC<DestructionProviderProps> = ({ children }) => {
  const [destroyedWords, setDestroyedWords] = useState<Set<string>>(new Set());
  const [destroyedImages, setDestroyedImages] = useState<Set<string>>(new Set());

  // Calculate if any destruction has occurred
  const hasDestruction = destroyedWords.size > 0 || destroyedImages.size > 0;

  // Word actions
  const destroyWord = useCallback((id: string) => {
    console.log('🔨 DestructionContext: Destroying word', id);
    setDestroyedWords(prev => new Set([...prev, id]));
  }, []);

  const repairWord = useCallback((id: string) => {
    console.log('🔧 DestructionContext: Repairing word', id);
    setDestroyedWords(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  // Image actions
  const destroyImage = useCallback((id: string) => {
    console.log('🔨 DestructionContext: Destroying image', id);
    setDestroyedImages(prev => new Set([...prev, id]));
  }, []);

  const repairImage = useCallback((id: string) => {
    console.log('🔧 DestructionContext: Repairing image', id);
    setDestroyedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  // Repair all - reset everything to intact state
  const repairAll = useCallback(() => {
    console.log('🔧 DestructionContext: REPAIRING ALL!', {
      wordsDestroyed: destroyedWords.size,
      imagesDestroyed: destroyedImages.size
    });
    
    setDestroyedWords(new Set());
    setDestroyedImages(new Set());
  }, [destroyedWords.size, destroyedImages.size]);

  // Getters
  const isWordDestroyed = useCallback((id: string) => {
    return destroyedWords.has(id);
  }, [destroyedWords]);

  const isImageDestroyed = useCallback((id: string) => {
    return destroyedImages.has(id);
  }, [destroyedImages]);

  const contextValue: DestructionState = {
    destroyedWords,
    destroyedImages,
    hasDestruction,
    destroyWord,
    destroyImage,
    repairWord,
    repairImage,
    repairAll,
    isWordDestroyed,
    isImageDestroyed,
  };

  return (
    <DestructionContext.Provider value={contextValue}>
      {children}
    </DestructionContext.Provider>
  );
};

// Hook to use the destruction context
export const useDestruction = (): DestructionState => {
  const context = useContext(DestructionContext);
  if (context === undefined) {
    throw new Error('useDestruction must be used within a DestructionProvider');
  }
  return context;
};

// Export the context for testing/debugging
export default DestructionContext;