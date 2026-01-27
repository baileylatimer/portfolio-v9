import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWeapon, WeaponType } from '~/contexts/WeaponContext';
import { useShootingMode } from '~/contexts/ShootingModeContext';
import { useDestruction } from '~/contexts/DestructionContext';

interface WeaponWheelProps {
  className?: string;
}

const WeaponWheel: React.FC<WeaponWheelProps> = ({ className = "" }) => {
  const { 
    activeWeapon, 
    setActiveWeapon, 
    weaponConfigs 
  } = useWeapon();
  
  const { enableShootingMode, disableShootingMode } = useShootingMode();
  const { hasDestruction, repairAll, destroyedWords, destroyedImages } = useDestruction();
  const [selectedIndex, setSelectedIndex] = useState(0); // Start with DEFAULT (index 0)
  const [isRepairing, setIsRepairing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const repairSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Fixed weapon order: DEFAULT(bottom), SHOTGUN(right), DYNAMITE(top), REVOLVER(left) - clockwise navigation
  const weaponOrder = [WeaponType.DEFAULT, WeaponType.SHOTGUN, WeaponType.DYNAMITE, WeaponType.REVOLVER];

  // Initialize repair sound
  useEffect(() => {
    repairSoundRef.current = new Audio('/sounds/repair.wav');
    repairSoundRef.current.preload = 'auto';
    repairSoundRef.current.volume = 0.7;
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle mobile toggle
  const toggleMobileExpansion = () => {
    setIsMobileExpanded(!isMobileExpanded);
  };

  // Calculate positioning based on mobile state
  const getWheelPosition = () => {
    if (!isMobile) {
      // Desktop positioning
      return {
        bottom: '120px',
        left: '40px',
        right: 'auto',
        transform: 'none'
      };
    } else {
      // Mobile positioning
      if (isMobileExpanded) {
        // Fully expanded - 40px from bottom, centered
        return {
          bottom: '40px',
          left: '50%',
          right: 'auto',
          transform: 'translateX(-50%)'
        };
      } else {
        // Collapsed - only 35px visible, centered
        return {
          bottom: '-265px', // Hide most of the wheel (300px - 35px = 265px)
          left: '50%',
          right: 'auto',
          transform: 'translateX(-50%)'
        };
      }
    }
  };

  // Handle weapon selection and wire to Revolver 3D model
  const selectWeapon = (weaponType: WeaponType) => {
    console.log('🎯 Selecting weapon:', weaponType);
    setActiveWeapon(weaponType);
    
    // Wire COLT SAA to Revolver 3D model
    if (weaponType === WeaponType.REVOLVER) {
      console.log('🔫 Activating Revolver 3D model for COLT SAA');
      enableShootingMode();
    } else {
      console.log('🔫 Deactivating Revolver 3D model');
      disableShootingMode();
    }
  };

  // Handle keyboard navigation
  const navigateWeapons = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = selectedIndex;
    let newIndex;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % weaponOrder.length;
    } else {
      newIndex = currentIndex === 0 ? weaponOrder.length - 1 : currentIndex - 1;
    }
    
    setSelectedIndex(newIndex);
    selectWeapon(weaponOrder[newIndex]);
  }, [selectedIndex, weaponOrder, setActiveWeapon, enableShootingMode, disableShootingMode]);

  // Update selected index when active weapon changes
  useEffect(() => {
    const index = weaponOrder.findIndex(weaponType => weaponType === activeWeapon);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  }, [activeWeapon]);

  // Add keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateWeapons('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateWeapons('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateWeapons]);

  // Handle repair functionality
  const handleRepair = async () => {
    console.log('🔧 WeaponWheel: Starting repair process', {
      destroyedWords: destroyedWords.size,
      destroyedImages: destroyedImages.size
    });

    setIsRepairing(true);

    // Play repair sound
    try {
      if (repairSoundRef.current) {
        repairSoundRef.current.currentTime = 0;
        await repairSoundRef.current.play();
      }
    } catch (error) {
      console.warn('Could not play repair sound:', error);
    }

    // Small delay for visual feedback
    setTimeout(() => {
      repairAll();
      setIsRepairing(false);
    }, 200);
  };

  // Generate SVG path for donut segment at specific angle
  const createSegmentPath = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) => {
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const x1 = 150 + outerRadius * Math.cos(startAngleRad);
    const y1 = 150 + outerRadius * Math.sin(startAngleRad);
    const x2 = 150 + outerRadius * Math.cos(endAngleRad);
    const y2 = 150 + outerRadius * Math.sin(endAngleRad);

    const x3 = 150 + innerRadius * Math.cos(endAngleRad);
    const y3 = 150 + innerRadius * Math.sin(endAngleRad);
    const x4 = 150 + innerRadius * Math.cos(startAngleRad);
    const y4 = 150 + innerRadius * Math.sin(startAngleRad);

    return [
      "M", x1, y1,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 1, x2, y2,
      "L", x3, y3,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 0, x4, y4,
      "Z"
    ].join(" ");
  };

  // Get segment angles (45-degree offset to put DEFAULT at bottom like GTA)
  const getSegmentAngles = (index: number) => {
    const segmentSize = 90; // 90 degrees per segment 
    const startAngle = index * segmentSize + 45; // Offset by 45 degrees to put index 0 at bottom
    const endAngle = startAngle + segmentSize;
    return { startAngle, endAngle };
  };

  // Get icon position within segment
  const getIconPosition = (index: number) => {
    const { startAngle, endAngle } = getSegmentAngles(index);
    const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
    const radius = 110; // Distance from center for icons
    
    return {
      x: 150 + radius * Math.cos(midAngle),
      y: 150 + radius * Math.sin(midAngle)
    };
  };

  const wheelPosition = getWheelPosition();

  return (
    <>
      {/* Mobile Toggle Button - Only visible on mobile */}
      {isMobile && (
        <button
          onClick={toggleMobileExpansion}
          className="fixed rounded-full flex items-center justify-center transition-all duration-300 ease-in-out"
          style={{
            width: '40px',
            height: '40px',
            background: '#1A1917',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            bottom: isMobileExpanded ? '348px' : '43px', // 40px + 8px above wheel when collapsed
            left: '50%',
            transform: `translateX(-50%) rotate(${isMobileExpanded ? '180deg' : '0deg'})`,
            zIndex: 1001,
            pointerEvents: 'auto'
          }}
        >
          {/* Up/Down Arrow Icon */}
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2"
          >
            <polyline points="18,15 12,9 6,15"/>
          </svg>
        </button>
      )}

      {/* Weapon Wheel */}
      <div 
        className={`weapon-wheel fixed ${className} transition-all duration-300 ease-in-out`}
        style={{
          ...wheelPosition,
          width: '300px',
          height: '300px',
          zIndex: 1000,
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      >
      {/* SVG Donut Wheel */}
      <svg width="300" height="300" className="absolute inset-0">
        <defs>
          {/* Red gradient for active segment */}
          <radialGradient id="activeGradient" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(255, 0, 0, 0.00)" />
            <stop offset="100%" stopColor="rgba(255, 0, 0, 0.30)" />
          </radialGradient>
        </defs>
        
        {/* Background circle */}
        <circle 
          cx="150" 
          cy="150" 
          r="145" 
          fill="rgba(20, 20, 20, 0.9)" 
          stroke="rgba(255, 255, 255, 0.1)" 
          strokeWidth="2"
        />
        
        {/* Inner hole */}
        <circle 
          cx="150" 
          cy="150" 
          r="70" 
          fill="rgba(60, 60, 60, 0.95)" 
        />

        {/* Weapon segments */}
        {weaponOrder.map((weaponType, index) => {
          const { startAngle, endAngle } = getSegmentAngles(index);
          const isActive = weaponType === activeWeapon;
          const segmentPath = createSegmentPath(startAngle, endAngle, 70, 145);
          
          return (
            <g key={weaponType}>
              {/* Segment background */}
              <path
                d={segmentPath}
                fill={isActive ? "url(#activeGradient)" : "rgba(20, 20, 20, 0.9)"}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'fill 0.2s ease' }}
                onClick={() => selectWeapon(weaponType)}
                onMouseEnter={() => setSelectedIndex(index)}
              />
            </g>
          );
        })}

        {/* Segment dividers */}
        {[0, 1, 2, 3].map((index) => {
          const angle = (index * 90 + 45) * Math.PI / 180; // Match weapon positioning offset
          const innerX = 150 + 70 * Math.cos(angle);
          const innerY = 150 + 70 * Math.sin(angle);
          const outerX = 150 + 145 * Math.cos(angle);
          const outerY = 150 + 145 * Math.sin(angle);
          
          return (
            <line
              key={index}
              x1={innerX}
              y1={innerY}
              x2={outerX}
              y2={outerY}
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2"
            />
          );
        })}
      </svg>

      {/* Weapon Icons */}
      {weaponOrder.map((weaponType, index) => {
        const weapon = weaponConfigs[weaponType];
        const isActive = weaponType === activeWeapon;
        const iconPos = getIconPosition(index);
        
        return (
          <div
            key={`${weaponType}-icon`}
            className="absolute pointer-events-none"
            style={{
              left: `${iconPos.x}px`,
              top: `${iconPos.y}px`,
              transform: 'translate(-50%, -50%)',
              width: '72px',
              height: '72px',
              transition: 'filter 0.2s ease'
            }}
          >
            <img 
              src={weapon.icon} 
              alt={weapon.name}
              className="w-full h-full object-contain"
              style={{ 
                filter: isActive 
                  ? 'brightness(1.3) drop-shadow(0 0 8px rgba(255, 100, 0, 0.8))' 
                  : 'brightness(0.9)',
                transition: 'filter 0.2s ease'
              }}
            />
          </div>
        );
      })}

      {/* Center Circle with Active Weapon Info */}
      <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center"
        style={{
          width: '140px',
          height: '140px',
          background: 'rgba(60, 60, 60, 0.95)',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          zIndex: 10
        }}
      >
        {/* Active Weapon Name */}
        <div 
          className="font-bold text-white mb-1"
          style={{ 
            fontSize: '16px',
            fontFamily: 'PPSupplyMono-Regular, monospace',
            letterSpacing: '1px'
          }}
        >
          {weaponConfigs[activeWeapon].name}
        </div>
        
        {/* Navigation Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateWeapons('prev');
            }}
            className="text-white hover:text-orange-400 transition-colors"
            style={{ fontSize: '18px' }}
          >
            ‹
          </button>
          
          {/* Weapon Counter */}
          <div 
            className="text-white"
            style={{ 
              fontSize: '14px',
              fontFamily: 'PPSupplyMono-Regular, monospace',
              opacity: 0.8
            }}
          >
            {selectedIndex + 1}/{weaponOrder.length}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateWeapons('next');
            }}
            className="text-white hover:text-orange-400 transition-colors"
            style={{ fontSize: '18px' }}
          >
            ›
          </button>
        </div>

        {/* Repair Button - Only show when destruction exists */}
        {hasDestruction && (
          <div className="mt-2 relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRepair();
              }}
              disabled={isRepairing}
              className={`
                relative
                w-8 h-8 rounded-full
                bg-orange-600 hover:bg-orange-500
                border border-orange-700 hover:border-orange-600
                flex items-center justify-center
                transition-all duration-200
                ${isRepairing ? 'animate-pulse' : 'hover:scale-110'}
                ${hasDestruction && !isRepairing ? 'animate-pulse' : ''}
              `}
              style={{
                background: '#1A1917',
                boxShadow: hasDestruction && !isRepairing 
                  ? '0 0 8px rgba(239, 68, 68, 0.6)' 
                  : '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {/* Wrench Icon */}
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2"
                className={isRepairing ? 'animate-spin' : ''}
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>

              {/* Destruction Counter Badge */}
              {(destroyedWords.size > 0 || destroyedImages.size > 0) && !isRepairing && (
                <div
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold"
                  style={{
                    fontSize: '9px',
                    lineHeight: '1'
                  }}
                >
                  {destroyedWords.size + destroyedImages.size}
                </div>
              )}
            </button>
          </div>
        )}
      </div>

    </div>
    </>
  );
};

export default WeaponWheel;
