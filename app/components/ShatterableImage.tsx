import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useShootingMode } from '~/contexts/ShootingModeContext';

interface ShatterableImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

interface ProgressiveFragment {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  state: 'visible' | 'falling' | 'gone';
  rotation: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  fallStartTime?: number;
}

const ShatterableImage: React.FC<ShatterableImageProps> = ({ 
  src, 
  alt, 
  className = "",
  style,
  children 
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<'intact' | 'cracking' | 'pixelating' | 'fragmented' | 'destroyed' | 'respawning'>('intact');
  const [fragments, setFragments] = useState<ProgressiveFragment[]>([]);
  const { isShootingMode } = useShootingMode();
  const animationFrameRef = useRef<number>();
  const respawnTimeoutRef = useRef<number>();

  // Award-winning progressive destruction sequence
  const shatterImage = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    console.log('🖼️ Progressive shatter sequence...', { stage, fragmentCount: fragments.length });

    if (stage === 'intact') {
      // FIRST SHOT: Complete shatter sequence
      console.log('🖼️ First shot - starting full shatter sequence');
      
      // Stage 1: Crack effect (200ms)
      setStage('cracking');
      
      setTimeout(() => {
        // Stage 2: Pixelation effect (300ms)
        setStage('pixelating');
        
        setTimeout(() => {
          // Stage 3: Create grid of fragments (all visible, no falling)
          const newFragments = generateProgressiveFragments();
          setFragments(newFragments);
          setStage('fragmented');
          
          console.log('🖼️ Created', newFragments.length, 'fragments in grid');
        }, 300);
      }, 200);

    } else if (stage === 'fragmented') {
      // SUBSEQUENT SHOTS: Knock off 1-2 visible fragments
      const visibleFragments = fragments.filter(f => f.state === 'visible');
      
      if (visibleFragments.length > 0) {
        const numToKnockOff = Math.random() < 0.7 ? 1 : 2; // 70% chance of 1, 30% chance of 2
        const fragmentsToKnockOff: ProgressiveFragment[] = [];
        
        // Randomly select fragments to knock off
        for (let i = 0; i < Math.min(numToKnockOff, visibleFragments.length); i++) {
          const randomIndex = Math.floor(Math.random() * visibleFragments.length);
          const fragment = visibleFragments.splice(randomIndex, 1)[0]; // Remove from array so we don't pick it again
          fragmentsToKnockOff.push(fragment);
        }
        
        console.log('🖼️ Knocking off', fragmentsToKnockOff.length, 'fragments. Remaining visible:', visibleFragments.length);
        
        // Start falling animation for selected fragments
        setFragments(currentFragments => {
          return currentFragments.map(fragment => {
            const shouldFall = fragmentsToKnockOff.some(f => f.id === fragment.id);
            if (shouldFall) {
              console.log('🖼️ Starting fall animation for fragment', fragment.id);
              
              // Convert container-relative position to viewport-absolute position
              const containerRect = containerRef.current!.getBoundingClientRect();
              const absoluteX = containerRect.left + fragment.x;
              const absoluteY = containerRect.top + fragment.y;
              
              return {
                ...fragment,
                state: 'falling' as const,
                fallStartTime: Date.now(),
                x: absoluteX, // Now relative to viewport
                y: absoluteY, // Now relative to viewport
                velocityX: (Math.random() - 0.5) * 15, // Dramatic horizontal velocity
                velocityY: -(Math.random() * 8 + 5), // Strong initial UPWARD velocity
                rotationSpeed: (Math.random() - 0.5) * 0.8 // Fast spin speed
              };
            }
            return fragment;
          });
        });

        // Animation will be started by useEffect after state update
        console.log('🖼️ Fragment state updated, animation will start via useEffect');

        // Check if all fragments will be gone after this
        const remainingAfterFall = visibleFragments.length;
        if (remainingAfterFall === 0) {
          console.log('🖼️ All fragments knocked off - starting respawn sequence');
          setTimeout(() => {
            setStage('destroyed');
            startRespawnSequence();
          }, 1000); // Give falling fragments time to animate
        }
      }
    }
  }, [stage, fragments]);

  // Generate grid of fragments for progressive destruction
  const generateProgressiveFragments = (): ProgressiveFragment[] => {
    if (!containerRef.current) return [];
    
    const rect = containerRef.current.getBoundingClientRect();
    const fragments: ProgressiveFragment[] = [];
    const gridCols = 4;
    const gridRows = 4;
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const fragmentWidth = rect.width / gridCols;
        const fragmentHeight = rect.height / gridRows;
        
        // Add slight overlap and randomization to make fragments look more realistic
        const overlap = 2; // pixels of overlap to prevent gaps
        const randomOffset = (Math.random() - 0.5) * 4; // slight random positioning
        
        fragments.push({
          id: row * gridCols + col,
          x: col * fragmentWidth + randomOffset - overlap,
          y: row * fragmentHeight + randomOffset - overlap,
          width: fragmentWidth + overlap * 2,
          height: fragmentHeight + overlap * 2,
          state: 'visible',
          rotation: (Math.random() - 0.5) * 0.1, // slight initial rotation
          velocityX: 0,
          velocityY: 0,
          rotationSpeed: 0
        });
      }
    }

    return fragments;
  };

  // Animate falling fragments with physics
  const animateFallingFragments = () => {
    let frameCount = 0;
    console.log('🎬 STARTING ANIMATION LOOP');
    
    const animate = () => {
      frameCount++;
      const now = Date.now();
      let hasFallingFragments = false;
      let updatedPositions: any[] = [];

      console.log(`🎬 FRAME ${frameCount}: Animation tick at`, now);

      setFragments(currentFragments => {
        console.log(`🎬 FRAME ${frameCount}: Current fragments:`, currentFragments.map(f => ({
          id: f.id,
          state: f.state,
          x: Math.round(f.x),
          y: Math.round(f.y),
          vX: Math.round(f.velocityX * 10) / 10,
          vY: Math.round(f.velocityY * 10) / 10
        })));

        const newFragments = currentFragments.map(fragment => {
          if (fragment.state === 'falling' && fragment.fallStartTime) {
            const elapsed = now - fragment.fallStartTime;
            const gravity = 0.5;
            const friction = 0.99;
            
            // Update physics
            const newVelocityY = fragment.velocityY + gravity;
            const newVelocityX = fragment.velocityX * friction;
            const newX = fragment.x + newVelocityX;
            const newY = fragment.y + newVelocityY;
            const newRotation = fragment.rotation + fragment.rotationSpeed;
            
            updatedPositions.push({
              id: fragment.id,
              oldPos: { x: Math.round(fragment.x), y: Math.round(fragment.y) },
              newPos: { x: Math.round(newX), y: Math.round(newY) },
              velocity: { x: Math.round(newVelocityX * 10) / 10, y: Math.round(newVelocityY * 10) / 10 }
            });
            
            // Check if fragment has fallen off screen
            if (newY > window.innerHeight + 100) {
              console.log(`🎬 FRAME ${frameCount}: Fragment ${fragment.id} fell off screen at y=${Math.round(newY)}`);
              return { ...fragment, state: 'gone' as const };
            }
            
            hasFallingFragments = true;
            
            return {
              ...fragment,
              x: newX,
              y: newY,
              rotation: newRotation,
              velocityX: newVelocityX,
              velocityY: newVelocityY
            };
          }
          
          if (fragment.state === 'falling') {
            hasFallingFragments = true;
          }
          
          return fragment;
        });
        
        if (updatedPositions.length > 0) {
          console.log(`🎬 FRAME ${frameCount}: Position updates:`, updatedPositions);
        }
        
        return newFragments;
      });
      
      console.log(`🎬 FRAME ${frameCount}: hasFallingFragments=${hasFallingFragments}, continuing=${hasFallingFragments}`);
      
      if (hasFallingFragments) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = undefined;
        console.log(`🎬 ANIMATION STOPPED: No more falling fragments after ${frameCount} frames`);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Start respawn sequence after all fragments are gone
  const startRespawnSequence = () => {
    console.log('🖼️ Starting respawn sequence...');
    setStage('destroyed');
    
    respawnTimeoutRef.current = window.setTimeout(() => {
      console.log('🖼️ Respawning image...');
      setStage('respawning');
      setFragments([]);
      
      setTimeout(() => {
        setStage('intact');
        console.log('🖼️ Image respawned and ready for destruction!');
      }, 500); // Brief transition
    }, 4000); // 4 seconds before respawn
  };

  // Listen for shatter events when in shooting mode
  useEffect(() => {
    console.log('🖼️ ShatterableImage useEffect:', {
      isShootingMode,
      hasContainer: !!containerRef.current,
      imageSrc: src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('/') + 20),
      stage
    });

    if (!isShootingMode || !containerRef.current) {
      console.log('🖼️ ShatterableImage: NOT attaching listener - isShootingMode:', isShootingMode, 'hasContainer:', !!containerRef.current);
      return;
    }

    console.log('🖼️ ShatterableImage: ATTACHING shatter-image listener for', src.substring(src.lastIndexOf('/') + 1));

    const handleShatter = (e: CustomEvent) => {
      console.log('🖼️ ShatterableImage: RECEIVED shatter-image event!', {
        eventDetail: e.detail,
        imageSrc: src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('/') + 20),
        stage: stage
      });

      const rect = containerRef.current!.getBoundingClientRect();
      const x = e.detail.x;
      const y = e.detail.y;
      
      console.log('🖼️ Hit detection:', {
        clickX: x,
        clickY: y,
        rectLeft: rect.left,
        rectRight: rect.right,
        rectTop: rect.top,
        rectBottom: rect.bottom,
        isInBounds: x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
      });
      
      // Check if click is within image bounds
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        console.log('🖼️ ShatterableImage: HIT! Triggering progressive shatter...', { currentStage: stage });
        shatterImage();
        e.stopPropagation(); // Prevent bullet hole on destroyed image
      } else {
        console.log('🖼️ ShatterableImage: MISS - click outside bounds');
      }
    };

    document.addEventListener('shatter-image', handleShatter as EventListener);
    console.log('🖼️ ShatterableImage: Event listener attached to document');

    return () => {
      console.log('🖼️ ShatterableImage: Cleaning up event listener');
      document.removeEventListener('shatter-image', handleShatter as EventListener);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (respawnTimeoutRef.current) {
        clearTimeout(respawnTimeoutRef.current);
      }
    };
  }, [isShootingMode, shatterImage, src, stage]);

  // Start animation when fragments change to falling state
  useEffect(() => {
    const fallingFragments = fragments.filter(f => f.state === 'falling');
    
    if (fallingFragments.length > 0 && !animationFrameRef.current) {
      console.log('🎬 useEffect: Starting animation for', fallingFragments.length, 'falling fragments');
      animateFallingFragments();
    } else if (fallingFragments.length === 0 && animationFrameRef.current) {
      console.log('🎬 useEffect: Stopping animation - no falling fragments');
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, [fragments, animateFallingFragments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (respawnTimeoutRef.current) {
        clearTimeout(respawnTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ overflow: 'hidden' }}>
      {/* Original Image with Stage Effects */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={`
          w-full h-full object-cover
          transition-all duration-200
          ${stage === 'intact' || stage === 'respawning' ? '' : 'pointer-events-none'}
          ${stage === 'cracking' ? 'animate-pulse' : ''}
          ${stage === 'pixelating' ? 'filter blur-[2px] contrast-125 saturate-150' : ''}
          ${stage === 'fragmented' || stage === 'destroyed' ? 'opacity-0' : ''}
          ${stage === 'respawning' ? 'opacity-50' : ''}
        `}
        style={{
          ...style,
          filter: stage === 'cracking' 
            ? 'drop-shadow(0 0 15px rgba(255, 100, 0, 0.8)) contrast(1.3) brightness(1.2)'
            : stage === 'pixelating'
            ? 'blur(2px) contrast(1.25) saturate(1.5)'
            : style?.filter,
          transform: stage === 'cracking' ? 'scale(1.02)' : 
                    stage === 'respawning' ? 'scale(0.95)' : undefined
        }}
      />

      {/* Progressive Fragment Layer */}
      {stage === 'fragmented' && (
        <>
          {/* Static Fragments - positioned relative to container */}
          <div className="absolute inset-0 pointer-events-none">
            {fragments.filter(f => f.state === 'visible').map((fragment) => (
              <div
                key={fragment.id}
                className="absolute bg-cover bg-no-repeat opacity-100"
                style={{
                  left: fragment.x,
                  top: fragment.y,
                  width: fragment.width,
                  height: fragment.height,
                  backgroundImage: `url(${src})`,
                  backgroundPosition: `-${fragment.x}px -${fragment.y}px`,
                  backgroundSize: `${containerRef.current?.getBoundingClientRect().width || 0}px ${containerRef.current?.getBoundingClientRect().height || 0}px`,
                  transform: `rotate(${fragment.rotation}rad)`,
                  zIndex: 10,
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3)) contrast(1.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                }}
              />
            ))}
          </div>

          {/* Flying Fragments - positioned relative to viewport */}
          {fragments.filter(f => f.state === 'falling').map((fragment) => {
            const containerRect = containerRef.current?.getBoundingClientRect();
            const originalX = containerRect ? fragment.x - containerRect.left : 0;
            const originalY = containerRect ? fragment.y - containerRect.top : 0;
            
            return (
              <div
                key={`flying-${fragment.id}`}
                className="fixed bg-cover bg-no-repeat pointer-events-none opacity-90"
                style={{
                  left: fragment.x,
                  top: fragment.y,
                  width: fragment.width,
                  height: fragment.height,
                  backgroundImage: `url(${src})`,
                  backgroundPosition: `-${originalX}px -${originalY}px`,
                  backgroundSize: `${containerRef.current?.getBoundingClientRect().width || 0}px ${containerRef.current?.getBoundingClientRect().height || 0}px`,
                  transform: `rotate(${fragment.rotation}rad) scale(${Math.max(0.3, 1 - (fragment.y / window.innerHeight * 0.7))})`,
                  zIndex: 1000,
                  filter: 'brightness(0.9) drop-shadow(4px 4px 8px rgba(0,0,0,0.5))'
                }}
              />
            );
          })}
        </>
      )}

      {/* Destroyed State Message */}
      {stage === 'destroyed' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white/50">
            <div className="text-sm uppercase tracking-wider">Respawning...</div>
          </div>
        </div>
      )}

      {/* Child elements remain intact */}
      {children}
    </div>
  );
};

export default ShatterableImage;