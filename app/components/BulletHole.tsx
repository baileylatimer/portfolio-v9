import React, { useEffect, useState } from 'react';

interface BulletHoleProps {
  x: number;
  y: number;
}

const BulletHole: React.FC<BulletHoleProps> = ({ x, y }) => {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setOpacity(0), 4500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <img 
      src="/images/bullet-hole.png" 
      alt="Bullet hole"
      className="absolute transition-opacity duration-500"
      style={{ 
        left: x, 
        top: y, 
        width: '150px', 
        height: '150px', 
        transform: 'translate(-50%, -50%)',
        opacity 
      }}
    />
  );
};

export default BulletHole;