import React, { useEffect, useState, useRef } from 'react';
import SmokeEffect from './SmokeEffect';
import PlasmaEffect from './PlasmaEffect';
import { WeaponType } from '~/contexts/WeaponContext';

interface BulletHoleProps {
  x: number;
  y: number;
  weaponType?: WeaponType;
}

const BulletHole: React.FC<BulletHoleProps> = ({ x, y, weaponType }) => {
  const [opacity, setOpacity] = useState(1);
  const [showEffect, setShowEffect] = useState(true);
  const effectRendered = useRef(false);
  const componentId = useRef(Date.now());

  const isRaygun = weaponType === WeaponType.RAYGUN;

  useEffect(() => {
    console.log(`BulletHole ${componentId.current} created`, { x, y, weaponType });
    
    const effectTimer = setTimeout(() => {
      console.log(`Stopping effect for BulletHole ${componentId.current}`);
      setShowEffect(false);
    }, 3000);
    
    const opacityTimer = setTimeout(() => {
      console.log(`Fading out bullet hole ${componentId.current}`);
      setOpacity(0);
    }, 4500);
    
    return () => {
      clearTimeout(effectTimer);
      clearTimeout(opacityTimer);
      console.log(`BulletHole ${componentId.current} unmounted`);
    };
  }, [x, y, weaponType]);

  const handleImageLoad = () => {
    console.log(`Bullet hole image loaded successfully for BulletHole ${componentId.current}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`Error loading bullet hole image for BulletHole ${componentId.current}:`, e);
  };

  return (
    <div 
      className="absolute pointer-events-none" 
      style={{ 
        left: x, 
        top: y, 
        transform: 'translate(-50%, -50%)', 
        zIndex: 1000,
        width: '100px',
        height: '100px',
      }}
    >
      {/* Raygun plasma burn or regular bullet hole */}
      {isRaygun ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `radial-gradient(circle, 
              rgba(0, 255, 0, 0.9) 0%, 
              rgba(50, 200, 50, 0.7) 20%, 
              rgba(100, 150, 100, 0.5) 40%,
              rgba(80, 80, 80, 0.8) 60%,
              rgba(40, 40, 40, 0.9) 80%,
              transparent 100%)`,
            borderRadius: '50%',
            opacity,
            transition: 'opacity 0.5s',
            position: 'absolute',
            top: 0,
            left: 0,
            filter: 'blur(1px)',
            boxShadow: 'inset 0 0 20px rgba(0, 255, 0, 0.6), 0 0 10px rgba(0, 255, 0, 0.3)',
            animation: 'plasmaBurnPulse 2s ease-out',
          }}
        />
      ) : (
        <img 
          src="/images/bullet-hole.png" 
          alt="Bullet hole"
          style={{ 
            width: '100%', 
            height: '100%', 
            opacity,
            transition: 'opacity 0.5s',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      
      {/* Effect particles */}
      {showEffect && !effectRendered.current && (
        <div style={{ 
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: '-50%',
          left: '-50%',
        }}>
          {isRaygun ? (
            <PlasmaEffect duration={3000} />
          ) : (
            <SmokeEffect duration={3000} />
          )}
          {effectRendered.current = true}
        </div>
      )}
      
      {/* CSS animations for plasma burn */}
      <style>{`
        @keyframes plasmaBurnPulse {
          0% { 
            transform: scale(0.5);
            box-shadow: inset 0 0 30px rgba(0, 255, 0, 1), 0 0 20px rgba(0, 255, 0, 0.8);
          }
          50% { 
            transform: scale(1.1);
            box-shadow: inset 0 0 25px rgba(0, 255, 0, 0.8), 0 0 15px rgba(0, 255, 0, 0.6);
          }
          100% { 
            transform: scale(1);
            box-shadow: inset 0 0 20px rgba(0, 255, 0, 0.6), 0 0 10px rgba(0, 255, 0, 0.3);
          }
        }
      `}</style>
    </div>
  );
};

export default React.memo(BulletHole);
