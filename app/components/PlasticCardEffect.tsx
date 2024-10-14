import React, { useRef, useState } from 'react';

interface PlasticCardEffectProps {
  children: React.ReactNode;
  className?: string;
}

const PlasticCardEffect: React.FC<PlasticCardEffectProps> = ({ children, className = '' }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div 
      ref={cardRef} 
      className={`plastic-card-effect relative overflow-hidden ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className={`absolute inset-0 pointer-events-none z-10 transition-all duration-300 ease-out ${
          isHovered ? 'opacity-80' : 'opacity-20'
        }`}
        style={{
          backgroundImage: 'linear-gradient(to bottom right, rgba(255,255,255,0.4), rgba(255,255,255,0.2))',
          mixBlendMode: 'overlay'
        }}
      ></div>
      <div 
        className={`relative transition-filter duration-300 ease-out ${
          isHovered ? 'sepia-0' : 'sepia-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default PlasticCardEffect;
