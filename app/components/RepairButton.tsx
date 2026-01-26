import React, { useRef, useEffect, useState } from 'react';
import { useDestruction } from '~/contexts/DestructionContext';

const RepairButton: React.FC = () => {
  const { hasDestruction, repairAll, destroyedWords, destroyedImages } = useDestruction();
  const [isRepairing, setIsRepairing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const repairSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize repair sound
  useEffect(() => {
    repairSoundRef.current = new Audio('/sounds/repair.wav');
    repairSoundRef.current.preload = 'auto';
    repairSoundRef.current.volume = 0.7;
  }, []);

  // Control visibility based on destruction state
  useEffect(() => {
    if (hasDestruction && !isVisible) {
      // Show button with slide-up animation
      setTimeout(() => setIsVisible(true), 200); // Small delay for smooth appearance
    } else if (!hasDestruction && isVisible) {
      // Hide button
      setIsVisible(false);
    }
  }, [hasDestruction, isVisible]);

  const handleRepair = async () => {
    console.log('🔧 RepairButton: Starting repair process', {
      destroyedWords: destroyedWords.size,
      destroyedImages: destroyedImages.size
    });

    setIsRepairing(true);

    // Play repair sound
    try {
      if (repairSoundRef.current) {
        repairSoundRef.current.currentTime = 0; // Reset to start
        await repairSoundRef.current.play();
      }
    } catch (error) {
      console.warn('Could not play repair sound:', error);
    }

    // Small delay for visual feedback
    setTimeout(() => {
      repairAll();
      setIsRepairing(false);
      
      // Hide button after repair
      setTimeout(() => {
        setIsVisible(false);
      }, 500);
    }, 200);
  };

  // Don't render if no destruction has occurred
  if (!hasDestruction && !isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50
        transition-all duration-500 ease-out
        ${isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-16 opacity-0 pointer-events-none'
        }
      `}
    >
      <button
        onClick={handleRepair}
        disabled={isRepairing}
        className={`
          group relative
          bg-orange-600 hover:bg-orange-500
          text-white font-bold
          px-6 py-3 rounded-lg
          border-2 border-orange-700 hover:border-orange-600
          shadow-lg hover:shadow-xl
          transition-all duration-200
          flex items-center gap-2
          text-sm uppercase tracking-wider
          ${isRepairing ? 'animate-pulse' : 'hover:scale-105'}
        `}
      >
        {/* Repair Icon */}
        <div className={`
          transition-transform duration-200
          ${isRepairing ? 'rotate-45' : 'group-hover:rotate-12'}
        `}>
          🔧
        </div>
        
        {/* Button Text */}
        <span className={isRepairing ? 'opacity-75' : ''}>
          {isRepairing ? 'REPAIRING...' : 'REPAIR'}
        </span>
        
        {/* Destruction Counter */}
        {(destroyedWords.size > 0 || destroyedImages.size > 0) && !isRepairing && (
          <div className="
            absolute -top-2 -right-2
            bg-red-500 text-white text-xs
            w-5 h-5 rounded-full
            flex items-center justify-center
            font-bold
          ">
            {destroyedWords.size + destroyedImages.size}
          </div>
        )}
        
        {/* Glowing effect when active */}
        <div className={`
          absolute inset-0 rounded-lg
          bg-orange-400/20 opacity-0
          transition-opacity duration-200
          ${isRepairing ? 'opacity-100 animate-pulse' : 'group-hover:opacity-50'}
        `} />
      </button>

      {/* Tooltip */}
      <div className="
        absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2
        bg-black/80 text-white text-xs
        px-2 py-1 rounded whitespace-nowrap
        opacity-0 group-hover:opacity-100
        transition-opacity duration-200 pointer-events-none
      ">
        Restore all destroyed elements
      </div>
    </div>
  );
};

export default RepairButton;