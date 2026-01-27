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

  // Handle word shooting with weapon-specific patterns - FIXED: Use refs to prevent stale closures
  const shootWord = useCallback((wordId: string, wordText: string, element: HTMLElement, weaponType?: string) => {
    const createFlyingWord = (id: string, text: string, elem: HTMLElement, velocityMultiplier = 1) => {
      const rect = elem.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(elem);
      
      return {
        id,
        text,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        velocityX: (Math.random() - 0.5) * 8 * velocityMultiplier,
        velocityY: -(Math.random() * 4 + 3) * velocityMultiplier,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.4 * velocityMultiplier,
        fallStartTime: Date.now(),
        scale: 1,
        fontSize: computedStyle.fontSize,
        fontFamily: computedStyle.fontFamily,
        fontWeight: computedStyle.fontWeight,
        color: computedStyle.color,
        lineHeight: computedStyle.lineHeight
      };
    };

    const destroyWords = (wordsToDestroy: string[]) => {
      const newFlyingWords: FlyingWord[] = [];
      const currentDestroyedWords = locallyDestroyedWordsRef.current; // Use ref to avoid stale closure
      const newDestroyedWords = new Set(currentDestroyedWords);
      
      wordsToDestroy.forEach(wId => {
        // Find the word element
        const wordElement = document.querySelector(`[data-word-id="${wId}"]`) as HTMLElement;
        if (wordElement && !newDestroyedWords.has(wId)) {
          const wordText = wordElement.textContent || '';
          if (wordText.trim()) { // Only destroy non-space words
            const velocityMultiplier = weaponType === 'shotgun' ? 1.3 : weaponType === 'dynamite' ? 1.5 : 1;
            newFlyingWords.push(createFlyingWord(wId, wordText, wordElement, velocityMultiplier));
            newDestroyedWords.add(wId);
            // Register with global context for repair button
            destroyWord(wId);
          }
        }
      });
      
      if (newFlyingWords.length > 0) {
        setFlyingWords(prev => {
          // Filter out duplicates to prevent React key errors
          const existingIds = new Set(prev.map(w => w.id));
          const uniqueNewWords = newFlyingWords.filter(w => !existingIds.has(w.id));
          console.log('📝 Adding unique flying words:', uniqueNewWords.map(w => w.id));
          return [...prev, ...uniqueNewWords];
        });
        setLocallyDestroyedWords(newDestroyedWords);
      }
    };

    // Use current words at time of execution, not from closure
    const currentWords = words; // This is fine since words is memoized and stable

    if (weaponType === 'shotgun') {
      // SHOTGUN: Destroy 2-3 words including the hit word and nearby words
      const wordsToDestroy = [wordId];
      const allWords = currentWords.filter(w => !w.isSpace && !locallyDestroyedWordsRef.current.has(w.id));
      const currentWordIndex = allWords.findIndex(w => w.id === wordId);
      
      if (currentWordIndex !== -1) {
        const additionalWords = Math.random() < 0.7 ? 1 : 2; // 70% chance for 1 extra, 30% for 2 extra
        
        // Add nearby words (before and after)
        for (let i = 1; i <= additionalWords && wordsToDestroy.length < 3; i++) {
          if (Math.random() < 0.5 && currentWordIndex - i >= 0) {
            wordsToDestroy.push(allWords[currentWordIndex - i].id);
          } else if (currentWordIndex + i < allWords.length) {
            wordsToDestroy.push(allWords[currentWordIndex + i].id);
          }
        }
      }
      
      console.log(`🔫 SHOTGUN: Destroying ${wordsToDestroy.length} words!`);
      destroyWords(wordsToDestroy);
      
    } else if (weaponType === 'dynamite') {
      // DYNAMITE: Destroy ALL words at once!
      const allWordIds = currentWords.filter(w => !w.isSpace && !locallyDestroyedWordsRef.current.has(w.id)).map(w => w.id);
      console.log(`🧨 DYNAMITE: Destroying ALL ${allWordIds.length} words!`);
      destroyWords(allWordIds);
      
    } else {
      // REVOLVER: Single word destruction (original behavior)
      console.log(`🔫 REVOLVER: Destroying single word`);
      destroyWords([wordId]);
    }
  }, [words, destroyWord]); // REMOVED locallyDestroyedWords dependency!

  // FINAL FIX: Clear ref before scheduling to prevent blocking continuation
  const animateWords = useCallback(() => {
    const animate = () => {
      // Clear the ref at start to prevent blocking next frame scheduling
      animationFrameRef.current = undefined;
      
      setFlyingWords(currentWords => {
        if (currentWords.length === 0) {
          return currentWords;
        }

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
            
            // Check if word has fallen off screen - increase threshold  
            if (newY > window.innerHeight + 200) {
              return { ...word, scale: 0 }; // Mark as gone
            }
            
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

        // Always schedule next frame if words exist (no guard check)
        if (newWords.length > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }

        return newWords;
      });
    };
    
    // Start animation loop
    animate();
  }, []);

  // Create a stable ref for shootWord to avoid re-creating the event listener
  const shootWordRef = useRef(shootWord);
  shootWordRef.current = shootWord;
  
  // Create a stable ref for isShootingMode to check inside handler without re-creating listener
  const isShootingModeRef = useRef(isShootingMode);
  isShootingModeRef.current = isShootingMode;

  // Listen for shatter events - ALWAYS ATTACHED to avoid timing issues!
  useEffect(() => {
    if (!containerRef.current) {
      console.log('📝 ShatterableText: No container, skipping listener attachment for:', id);
      return;
    }

    console.log('📝 ShatterableText: PERMANENTLY ATTACHING shatter-image listener for:', id);

    const handleShatter = (e: CustomEvent) => {
      // Check shooting mode INSIDE handler to avoid timing issues
      if (!isShootingModeRef.current) {
        console.log('📝 ShatterableText: Ignoring event - shooting mode disabled');
        return;
      }
      
      console.log('📝 ShatterableText RECEIVED event at:', e.detail, 'Component ID:', id);
      const { x, y, weaponType } = e.detail;

      // Use document.elementFromPoint() like the working paintball site
      const element = document.elementFromPoint(x, y);
      console.log('📝 Element at point:', element);
      
      if (element && element.hasAttribute('data-word-id')) {
        const wordId = element.getAttribute('data-word-id');
        const wordText = element.textContent;
        
        console.log('📝 HIT DETECTED! Word:', wordText, 'ID:', wordId, 'Weapon:', weaponType);
        
        // Use ref.current to avoid stale closure issues
        if (wordId && wordText && !locallyDestroyedWordsRef.current.has(wordId)) {
          console.log('📝 SHOOTING WORD!', wordText, 'with', weaponType);
          
          // Use ref to access current shootWord function to prevent re-renders
          shootWordRef.current(wordId, wordText, element as HTMLElement, weaponType);
          e.stopPropagation(); // Prevent bullet hole
        } else {
          console.log('📝 Cannot shoot - already destroyed');
        }
      } else {
        console.log('📝 No word element at coordinates');
      }
    };

    document.addEventListener('shatter-image', handleShatter as EventListener);
    console.log('📝 ShatterableText: PERMANENT event listener attached to document for:', id);

    return () => {
      console.log('📝 ShatterableText: Cleaning up PERMANENT event listener for:', id);
      document.removeEventListener('shatter-image', handleShatter as EventListener);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [id]); // ONLY depend on id - never re-attach listener!

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
