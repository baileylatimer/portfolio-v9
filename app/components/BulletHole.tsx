import React, { useEffect, useState, useRef } from 'react';
import SmokeEffect from './SmokeEffect';

interface BulletHoleProps {
  x: number;
  y: number;
}

const BulletHole: React.FC<BulletHoleProps> = ({ x, y }) => {
  const [opacity, setOpacity] = useState(1);
  const [showSmoke, setShowSmoke] = useState(true);
  const smokeRendered = useRef(false);
  const componentId = useRef(Date.now());

  useEffect(() => {
    console.log(`BulletHole ${componentId.current} created`, { x, y });
    
    const smokeTimer = setTimeout(() => {
      console.log(`Stopping smoke effect for BulletHole ${componentId.current}`);
      setShowSmoke(false);
    }, 3000);
    
    const opacityTimer = setTimeout(() => {
      console.log(`Fading out bullet hole ${componentId.current}`);
      setOpacity(0);
    }, 4500);
    
    return () => {
      clearTimeout(smokeTimer);
      clearTimeout(opacityTimer);
      console.log(`BulletHole ${componentId.current} unmounted`);
    };
  }, [x, y]);

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
      {showSmoke && !smokeRendered.current && (
        <div style={{ 
          position: 'absolute',
          width: '200px',
          height: '200px',
          top: '-50%',
          left: '-50%',
        }}>
          <SmokeEffect duration={3000} /> 
          {smokeRendered.current = true}
        </div>
      )}
    </div>
  );
};

export default React.memo(BulletHole);
