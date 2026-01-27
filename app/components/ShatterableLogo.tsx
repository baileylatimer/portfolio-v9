import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useShootingMode } from '~/contexts/ShootingModeContext';
import { useDestruction } from '~/contexts/DestructionContext';

interface ShatterableLogoProps {
  src: string;
  alt: string;
  id: string; // Unique identifier for this logo
  className?: string;
  style?: React.CSSProperties;
}

interface FlyingLogo {
  id: string;
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

const ShatterableLogo: React.FC<ShatterableLogoProps> = ({ 
  src, 
  alt, 
  id,
  className = "",
  style 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isShootingMode } = useShootingMode();
  const { isImageDestroyed, destroyImage } = useDestruction();
  const [flyingLogo, setFlyingLogo] = useState<FlyingLogo | null>(null);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const animationFrameRef = useRef<number>();

  // Handle logo shooting
  const shootLogo = useCallback((element: HTMLElement) => {
    // Immediately launch logo (no cracking effect)
    const rect = element.getBoundingClientRect();
    
    const flyingLogoData: FlyingLogo = {
      id,
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      // Same physics as words - logos are typically small like words
      velocityX: (Math.random() - 0.5) * 8,       // ±4
      velocityY: -(Math.random() * 4 + 3),        // -3 to -7 UPWARD
      rotation: 0,
      rotationSpeed: (Math.random() - 0.5) * 0.4, // ±0.2
      fallStartTime: Date.now(),
      scale: 1
    };

    setFlyingLogo(flyingLogoData);
    setIsDestroyed(true);
  }, [id]);

  // Animate flying logo with physics
  const animateLogo = useCallback(() => {
    const animate = () => {
      setFlyingLogo(currentLogo => {
        if (!currentLogo) return null;
        
        // Same physics as ShatterableText
        const gravity = 0.5;
        const friction = 0.99;
        
        // Update physics
        const newVelocityY = currentLogo.velocityY + gravity;
        const newVelocityX = currentLogo.velocityX * friction;
        const newX = currentLogo.x + newVelocityX;
        const newY = currentLogo.y + newVelocityY;
        const newRotation = currentLogo.rotation + currentLogo.rotationSpeed;
        
        // Check if logo has fallen off screen
        if (newY > window.innerHeight + 100) {
          animationFrameRef.current = undefined;
          return null; // Remove from state
        }
        
        const updatedLogo = {
          ...currentLogo,
          x: newX,
          y: newY,
          rotation: newRotation,
          velocityX: newVelocityX,
          velocityY: newVelocityY
        };
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return updatedLogo;
      });
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Listen for shatter events when in shooting mode
  useEffect(() => {
    console.log('🏢 ShatterableLogo useEffect:', {
      isShootingMode,
      hasContainer: !!containerRef.current,
      id
    });

    if (!isShootingMode || !containerRef.current || isDestroyed) {
      console.log('🏢 ShatterableLogo: NOT attaching listener - isShootingMode:', isShootingMode, 'hasContainer:', !!containerRef.current, 'isDestroyed:', isDestroyed);
      return;
    }

    console.log('🏢 ShatterableLogo: ATTACHING shatter-image listener for:', id);

    const handleShatter = (e: CustomEvent) => {
      console.log('🏢 ShatterableLogo RECEIVED event at:', e.detail, 'Component ID:', id);
      const { x, y } = e.detail;

      // Use document.elementFromPoint() to detect direct hit
      const element = document.elementFromPoint(x, y);
      console.log('🏢 Element at point:', element);
      
      if (element && containerRef.current && containerRef.current.contains(element)) {
        console.log('🏢 HIT DETECTED! Logo:', alt, 'ID:', id);
        
        // Register with global destruction context (for repair button)
        destroyImage(id);
        
        shootLogo(element as HTMLElement);
        e.stopPropagation(); // Prevent bullet hole
      } else {
        console.log('🏢 No logo hit at coordinates');
      }
    };

    document.addEventListener('shatter-image', handleShatter as EventListener);
    console.log('🏢 ShatterableLogo: Event listener attached to document');

    return () => {
      console.log('🏢 ShatterableLogo: Cleaning up event listener');
      document.removeEventListener('shatter-image', handleShatter as EventListener);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isShootingMode, shootLogo, id, isDestroyed, alt, destroyImage]);

  // Start animation when flying logo is created
  useEffect(() => {
    if (flyingLogo && !animationFrameRef.current) {
      animateLogo();
    }
  }, [flyingLogo, animateLogo]);

  // Listen for repair events from DestructionContext
  useEffect(() => {
    if (isDestroyed && !isImageDestroyed(id)) {
      console.log('🔧 ShatterableLogo: Global repair detected - restoring logo', id);
      // Reset logo when repair happens
      setIsDestroyed(false);
      setFlyingLogo(null);
    }
  }, [isImageDestroyed, id, isDestroyed]);

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
      {/* Original logo */}
      <div 
        ref={containerRef} 
        className={`${className} ${isDestroyed ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        style={style}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full h-auto max-h-16 object-contain"
        />
      </div>

      {/* Flying logo layer */}
      {flyingLogo && (
        <div
          className="fixed pointer-events-none"
          style={{
            left: flyingLogo.x,
            top: flyingLogo.y,
            width: flyingLogo.width,
            height: flyingLogo.height,
            transform: `translate3d(0, 0, 0) rotate(${flyingLogo.rotation}rad) scale(${flyingLogo.scale})`,
            transformOrigin: 'center center',
            zIndex: 1000,
            filter: 'brightness(0.9) drop-shadow(2px 2px 4px rgba(0,0,0,0.4))',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            perspective: 1000
          }}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full h-auto max-h-16 object-contain"
          />
        </div>
      )}
    </>
  );
};

export default ShatterableLogo;