import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useShootingMode } from '~/contexts/ShootingModeContext';
import { useDestruction } from '~/contexts/DestructionContext';

interface ShatterableTextProps {
  text?: string | null;
  id: string; // Unique identifier for this text block (e.g., "mission", "about", "services")
  className?: string;
  style?: React.CSSProperties;
}

interface FlyingWord {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  rotationSpeed: number;
  fallStartTime: number;
  scale: number;
  // Capture explicit styles for visibility
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  color: string;
  lineHeight: string;
}

const ShatterableText: React.FC<ShatterableTextProps> = ({ 
  text, 
  id,
  className = "",
  style 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isShootingMode } = useShootingMode();
  const { isWordDestroyed, destroyWord } = useDestruction();
  const [crackingWords, setCrackingWords] = useState<Set<string>>(new Set());
  const [flyingWords, setFlyingWords] = useState<FlyingWord[]>([]);
  const [locallyDestroyedWords, setLocallyDestroyedWords] = useState<Set<string>>(new Set()); // Track locally to prevent re-renders
  const animationFrameRef = useRef<number>();
  
  // Ref to access current destroyed words without causing re-renders
  const locallyDestroyedWordsRef = useRef(locallyDestroyedWords);
  locallyDestroyedWordsRef.current = locallyDestroyedWords;

  // Memoize words array to prevent unnecessary re-renders that trigger repair useEffect
  const words = useMemo(() => {
    // Handle null/undefined text
    if (!text) return [];
    
    return text.split(/(\s+)/).map((word, index) => ({
      text: word,
      id: `word-${id}-${index}`,
      isSpace: /^\s+$/.test(word) // Check if it's just whitespace
    }));
  }, [text, id]);

  // Handle word shooting
  const shootWord = useCallback((wordId: string, wordText: string, element: HTMLElement) => {
    // Immediately launch word (no cracking effect)
    const rect = element.getBoundingClientRect();
    
    // Capture computed styles for visible flying words
    const computedStyle = window.getComputedStyle(element);
    
    const flyingWord: FlyingWord = {
      id: wordId,
      text: wordText,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      // Slower velocities for smaller word elements (vs large image fragments)
      velocityX: (Math.random() - 0.5) * 8,       // Reduced from 15 to 8: ±4
      velocityY: -(Math.random() * 4 + 3),        // Reduced from (8+5) to (4+3): -3 to -7 UPWARD
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.4, // Reduced from 0.8 to 0.4: ±0.2
      fallStartTime: Date.now(),
      scale: 1,
      // Capture explicit font styles for visibility
      fontSize: computedStyle.fontSize,
      fontFamily: computedStyle.fontFamily,
      fontWeight: computedStyle.fontWeight,
      color: computedStyle.color,
      lineHeight: computedStyle.lineHeight
    };

    setFlyingWords(prev => [...prev, flyingWord]);

    // Track locally ONLY - no global context updates to prevent cascading re-renders
    setLocallyDestroyedWords(prev => new Set([...prev, wordId]));
  }, []); // No dependencies - completely isolated from global state

  // EXACT frame-based physics from ShatterableImage
  const animateWords = useCallback(() => {
    const animate = () => {
      let hasFlyingWords = false;

      setFlyingWords(currentWords => {
        const newWords = currentWords.map(word => {
          if (word.fallStartTime) {
            // EXACT ShatterableImage physics
            const gravity = 0.5;  // Same as ShatterableImage
            const friction = 0.99; // Same as ShatterableImage
            
            // Update physics (frame-based, not time-based)
            const newVelocityY = word.velocityY + gravity;
            const newVelocityX = word.velocityX * friction;
            const newX = word.x + newVelocityX;
            const newY = word.y + newVelocityY;
            const newRotation = word.rotation + word.rotationSpeed;
            
            // Check if word has fallen off screen
            if (newY > window.innerHeight + 100) {
              return { ...word, scale: 0 }; // Mark as gone
            }
            
            hasFlyingWords = true;
            
            return {
              ...word,
              x: newX,
              y: newY,
              rotation: newRotation,
              velocityX: newVelocityX,
              velocityY: newVelocityY
            };
          }
          
          return word;
        }).filter(word => word.scale > 0); // Remove words that fell off screen
        
        if (hasFlyingWords) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = undefined;
        }

        return newWords;
      });
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Listen for shatter events when in shooting mode
  useEffect(() => {
    console.log('📝 ShatterableText useEffect:', {
      isShootingMode,
      hasContainer: !!containerRef.current,
      id
    });

    if (!isShootingMode || !containerRef.current) {
      console.log('📝 ShatterableText: NOT attaching listener - isShootingMode:', isShootingMode, 'hasContainer:', !!containerRef.current);
      return;
    }

    console.log('📝 ShatterableText: ATTACHING shatter-image listener for:', id);

    const handleShatter = (e: CustomEvent) => {
      console.log('📝 ShatterableText RECEIVED event at:', e.detail, 'Component ID:', id);
      const { x, y } = e.detail;

      // Use document.elementFromPoint() like the working paintball site
      const element = document.elementFromPoint(x, y);
      console.log('📝 Element at point:', element);
      
      if (element && element.hasAttribute('data-word-id')) {
        const wordId = element.getAttribute('data-word-id');
        const wordText = element.textContent;
        
        console.log('📝 HIT DETECTED! Word:', wordText, 'ID:', wordId);
        
        // Use ref.current to avoid stale closure issues
        if (wordId && wordText && !locallyDestroyedWordsRef.current.has(wordId)) {
          console.log('📝 SHOOTING WORD!', wordText);
          
          // Register with global destruction context (for repair button)
          destroyWord(wordId);
          
          shootWord(wordId, wordText, element as HTMLElement);
          e.stopPropagation(); // Prevent bullet hole
        } else {
          console.log('📝 Cannot shoot - already destroyed');
        }
      } else {
        console.log('📝 No word element at coordinates');
      }
    };

    document.addEventListener('shatter-image', handleShatter as EventListener);
    console.log('📝 ShatterableText: Event listener attached to document');

    return () => {
      console.log('📝 ShatterableText: Cleaning up event listener');
      document.removeEventListener('shatter-image', handleShatter as EventListener);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isShootingMode, shootWord, id]); // Removed locallyDestroyedWords to prevent stale closures

  // Start animation when flying words are created
  useEffect(() => {
    if (flyingWords.length > 0 && !animationFrameRef.current) {
      animateWords();
    }
  }, [flyingWords, animateWords]);

  // Listen for repair events from DestructionContext
  useEffect(() => {
    // Simple repair detection: if we have local destroyed words but no global ones, repair happened
    if (locallyDestroyedWords.size > 0) {
      const hasAnyGlobalDestruction = words.some(word => !word.isSpace && isWordDestroyed(word.id));
      
      if (!hasAnyGlobalDestruction) {
        console.log('📝 Global repair detected - clearing local state');
        // Clear local state when global repair happens
        setLocallyDestroyedWords(new Set());
        setFlyingWords([]);
        setCrackingWords(new Set());
      }
    }
  }, [words, isWordDestroyed, locallyDestroyedWords]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Main text with individual word spans */}
      <div ref={containerRef} className={className} style={style}>
        {words.map((word) => {
          // Use local destruction state during animation to prevent expensive context calls
          const isLocallyDestroyed = locallyDestroyedWords.has(word.id);
          const isGloballyDestroyed = isWordDestroyed(word.id);
          const isDestroyed = isLocallyDestroyed || isGloballyDestroyed;
          const isCracking = crackingWords.has(word.id);

          if (word.isSpace) {
            // Render spaces normally (no interaction)
            return <span key={word.id}>{word.text}</span>;
          }

          return (
            <span
              key={word.id}
              data-word-id={word.id}
              className={`
                inline-block
                ${isCracking ? 'animate-pulse' : ''}
                ${isDestroyed ? 'opacity-0' : 'opacity-100'}
                transition-opacity duration-200
              `}
              style={{
                filter: isCracking 
                  ? 'drop-shadow(0 0 8px rgba(255, 100, 0, 0.8)) contrast(1.2) brightness(1.1)'
                  : undefined,
                transform: isCracking ? 'scale(1.05)' : undefined,
                transformOrigin: 'center center'
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>

      {/* Flying words layer */}
      {flyingWords.map((word) => (
        <div
          key={`flying-${word.id}`}
          className="fixed pointer-events-none"
          style={{
            left: word.x,
            top: word.y,
            width: word.width,
            height: word.height,
            transform: `translate3d(0, 0, 0) rotate(${word.rotation}rad) scale(${word.scale})`,
            transformOrigin: 'center center',
            zIndex: 1000,
            // Use captured explicit styles for visibility
            fontSize: word.fontSize,
            fontFamily: word.fontFamily,
            fontWeight: word.fontWeight,
            color: word.color,
            lineHeight: word.lineHeight,
            filter: 'brightness(0.9) drop-shadow(2px 2px 4px rgba(0,0,0,0.4))',
            whiteSpace: 'nowrap',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            perspective: 1000
          }}
        >
          {word.text}
        </div>
      ))}
    </>
  );
};

export default ShatterableText;
