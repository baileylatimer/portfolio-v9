import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useShootingMode } from '~/contexts/ShootingModeContext';
import { useDestruction } from '~/contexts/DestructionContext';

interface ShatterableTextProps {
  text: string;
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
}

const ShatterableText: React.FC<ShatterableTextProps> = ({ 
  text, 
  id,
  className = "",
  style 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isShootingMode } = useShootingMode();
  const { destroyWord, isWordDestroyed } = useDestruction();
  const [crackingWords, setCrackingWords] = useState<Set<string>>(new Set());
  const [flyingWords, setFlyingWords] = useState<FlyingWord[]>([]);
  const animationFrameRef = useRef<number>();

  // Split text into words with unique IDs
  const words = text.split(/(\s+)/).map((word, index) => ({
    text: word,
    id: `word-${id}-${index}`,
    isSpace: /^\s+$/.test(word) // Check if it's just whitespace
  }));

  // Handle word shooting
  const shootWord = useCallback((wordId: string, wordText: string, element: HTMLElement) => {
    console.log('💥 ShatterableText: Shooting word', { wordId, wordText });

    // Phase 1: Crack effect
    setCrackingWords(prev => new Set([...prev, wordId]));

    setTimeout(() => {
      // Phase 2: Launch word
      const rect = element.getBoundingClientRect();
      
      const flyingWord: FlyingWord = {
        id: wordId,
        text: wordText,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        velocityX: (Math.random() - 0.5) * 20, // Random horizontal velocity
        velocityY: -(Math.random() * 10 + 5),  // Strong upward velocity
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.15, // Spin speed
        fallStartTime: Date.now(),
        scale: 1
      };

      setFlyingWords(prev => [...prev, flyingWord]);
      setCrackingWords(prev => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });

      // Mark word as destroyed in global context
      destroyWord(wordId);

      // Start physics animation
      if (!animationFrameRef.current) {
        animateWords();
      }
    }, 200); // 200ms crack effect duration
  }, [destroyWord]);

  // Physics animation for flying words
  const animateWords = useCallback(() => {
    const animate = () => {
      setFlyingWords(currentWords => {
        if (currentWords.length === 0) {
          animationFrameRef.current = undefined;
          return currentWords;
        }

        const updatedWords = currentWords
          .map(word => {
            const gravity = 0.6;
            const friction = 0.98;
            
            // Update physics
            const newVelocityY = word.velocityY + gravity;
            const newVelocityX = word.velocityX * friction;
            const newX = word.x + newVelocityX;
            const newY = word.y + newVelocityY;
            const newRotation = word.rotation + word.rotationSpeed;
            
            // Scale down as it falls (distance effect)
            const fallDistance = newY - word.y + word.height;
            const newScale = Math.max(0.2, 1 - (fallDistance / window.innerHeight * 0.8));

            return {
              ...word,
              x: newX,
              y: newY,
              velocityX: newVelocityX,
              velocityY: newVelocityY,
              rotation: newRotation,
              scale: newScale
            };
          })
          .filter(word => word.y < window.innerHeight + 200); // Remove words that fell off screen

        if (updatedWords.length > 0) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          animationFrameRef.current = undefined;
        }

        return updatedWords;
      });
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Listen for shatter events when in shooting mode
  useEffect(() => {
    if (!isShootingMode || !containerRef.current) return;

    const handleShatter = (e: CustomEvent) => {
      const { x, y } = e.detail;

      // Find which word was clicked
      if (containerRef.current) {
        const wordElements = containerRef.current.querySelectorAll('[data-word-id]');
        
        for (const element of wordElements) {
          const rect = element.getBoundingClientRect();
          
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            const wordId = element.getAttribute('data-word-id');
            const wordText = element.textContent;
            
            // Only shoot if word is not already destroyed
            if (wordId && wordText && !isWordDestroyed(wordId)) {
              shootWord(wordId, wordText, element as HTMLElement);
              e.stopPropagation(); // Prevent bullet hole
              break;
            }
          }
        }
      }
    };

    document.addEventListener('shatter-image', handleShatter as EventListener);

    return () => {
      document.removeEventListener('shatter-image', handleShatter as EventListener);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isShootingMode, shootWord, isWordDestroyed]);

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
          const isDestroyed = isWordDestroyed(word.id);
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
          className="fixed pointer-events-none font-inherit"
          style={{
            left: word.x,
            top: word.y,
            width: word.width,
            height: word.height,
            transform: `rotate(${word.rotation}rad) scale(${word.scale})`,
            transformOrigin: 'center center',
            zIndex: 1000,
            fontSize: 'inherit',
            fontFamily: 'inherit',
            fontWeight: 'inherit',
            color: 'inherit',
            filter: 'brightness(0.9) drop-shadow(2px 2px 4px rgba(0,0,0,0.4))',
            whiteSpace: 'nowrap'
          }}
        >
          {word.text}
        </div>
      ))}
    </>
  );
};

export default ShatterableText;