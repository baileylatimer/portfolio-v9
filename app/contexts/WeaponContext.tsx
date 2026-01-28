import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Weapon types enum
export enum WeaponType {
  DEFAULT = 'default',
  REVOLVER = 'revolver',
  SHOTGUN = 'shotgun',
  DYNAMITE = 'dynamite',
  RAYGUN = 'raygun'
}

// Weapon configuration
export interface WeaponConfig {
  id: WeaponType;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  effectType: 'precision' | 'spread' | 'explosive' | 'utility';
  damage: number;
  fireRate: number;
  range: number;
}

// Expandable weapon configuration - easy to add new weapons
export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  [WeaponType.DEFAULT]: {
    id: WeaponType.DEFAULT,
    name: 'DEFAULT',
    icon: '/images/weapons/weapon-cursor.png',
    description: 'Standard cursor interaction',
    unlocked: true,
    effectType: 'utility',
    damage: 1,
    fireRate: 1,
    range: 1
  },
  [WeaponType.REVOLVER]: {
    id: WeaponType.REVOLVER,
    name: 'COLT SAA',
    icon: '/images/weapons/weapon-pistol.png',
    description: 'Precision single-shot revolver',
    unlocked: true,
    effectType: 'precision',
    damage: 3,
    fireRate: 1,
    range: 3
  },
  [WeaponType.SHOTGUN]: {
    id: WeaponType.SHOTGUN,
    name: 'SHOTGUN',
    icon: '/images/weapons/weapon-shotgun.png',
    description: 'Close-range spread damage',
    unlocked: true, // Show all weapons immediately
    effectType: 'spread',
    damage: 2,
    fireRate: 0.5,
    range: 2
  },
  [WeaponType.DYNAMITE]: {
    id: WeaponType.DYNAMITE,
    name: 'DYNAMITE',
    icon: '/images/weapons/weapon-tnt.png',
    description: 'Area-of-effect explosive',
    unlocked: true, // Show all weapons immediately
    effectType: 'explosive',
    damage: 5,
    fireRate: 0.3,
    range: 5
  },
  [WeaponType.RAYGUN]: {
    id: WeaponType.RAYGUN,
    name: 'RAY GUN',
    icon: '/images/weapons/weapon-raygun.png', // Official raygun icon
    description: 'Sci-fi energy weapon (Easter Egg!)',
    unlocked: false, // Hidden until unlocked
    effectType: 'precision',
    damage: 4,
    fireRate: 2,
    range: 5
  }
};

// Weapon context state interface
interface WeaponContextState {
  activeWeapon: WeaponType;
  unlockedWeapons: Set<WeaponType>;
  isWheelOpen: boolean;
  weaponConfigs: Record<WeaponType, WeaponConfig>;
  
  // Actions
  setActiveWeapon: (weapon: WeaponType) => void;
  unlockWeapon: (weapon: WeaponType) => void;
  toggleWeaponWheel: () => void;
  setWheelOpen: (open: boolean) => void;
  getUnlockedWeapons: () => WeaponConfig[];
  isWeaponUnlocked: (weapon: WeaponType) => boolean;
}

// Create context
const WeaponContext = createContext<WeaponContextState | undefined>(undefined);

// Provider component
interface WeaponProviderProps {
  children: ReactNode;
}

export const WeaponProvider: React.FC<WeaponProviderProps> = ({ children }) => {
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>(WeaponType.DEFAULT);
  const [unlockedWeapons, setUnlockedWeapons] = useState<Set<WeaponType>>(new Set());
  const [isWheelOpen, setIsWheelOpen] = useState(false);

  // Initialize unlocked weapons from localStorage
  useEffect(() => {
    // Always start with base weapons available
    const baseWeapons = new Set([WeaponType.DEFAULT, WeaponType.REVOLVER, WeaponType.SHOTGUN, WeaponType.DYNAMITE]);
    
    // Check if raygun was previously unlocked
    const raygunUnlocked = typeof window !== 'undefined' ? localStorage.getItem('raygunUnlocked') === 'true' : false;
    
    if (raygunUnlocked) {
      // Raygun was unlocked, so replace revolver with raygun
      baseWeapons.delete(WeaponType.REVOLVER);
      baseWeapons.add(WeaponType.RAYGUN);
      console.log('🚀 Raygun previously unlocked - loading raygun instead of revolver');
    }
    
    setUnlockedWeapons(baseWeapons);
    console.log('🔓 Initialized weapons:', Array.from(baseWeapons));
  }, []);

  const unlockWeapon = (weapon: WeaponType) => {
    console.log('🔓 Unlocking weapon:', weapon);
    
    // Special handling for raygun - save to separate localStorage flag
    if (weapon === WeaponType.RAYGUN) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('raygunUnlocked', 'true');
        console.log('💾 Saved raygun unlock state to localStorage');
      }
      
      setUnlockedWeapons(prev => {
        const newUnlocked = new Set(prev);
        
        // Replace revolver with raygun
        if (prev.has(WeaponType.REVOLVER)) {
          newUnlocked.delete(WeaponType.REVOLVER);
          console.log('🔄 Raygun unlocked! Replacing revolver in weapon wheel.');
        }
        newUnlocked.add(WeaponType.RAYGUN);
        
        return newUnlocked;
      });

      // Auto-switch to raygun when unlocked for immediate gratification
      console.log('✨ Auto-switching to unlocked raygun!');
      setActiveWeapon(WeaponType.RAYGUN);
    } else {
      // Regular weapon unlock
      setUnlockedWeapons(prev => new Set([...prev, weapon]));
    }
  };

  const toggleWeaponWheel = () => {
    setIsWheelOpen(!isWheelOpen);
  };

  const setWheelOpen = (open: boolean) => {
    setIsWheelOpen(open);
  };

  const getUnlockedWeapons = (): WeaponConfig[] => {
    return Array.from(unlockedWeapons)
      .map(weaponType => WEAPON_CONFIGS[weaponType])
      .filter(Boolean);
  };

  const isWeaponUnlocked = (weapon: WeaponType): boolean => {
    return unlockedWeapons.has(weapon);
  };

  const handleSetActiveWeapon = (weapon: WeaponType) => {
    if (unlockedWeapons.has(weapon)) {
      console.log('🎯 Switching to weapon:', weapon);
      setActiveWeapon(weapon);
      setIsWheelOpen(false); // Close wheel after selection
    } else {
      console.log('🔒 Weapon not unlocked:', weapon);
    }
  };

  const value: WeaponContextState = {
    activeWeapon,
    unlockedWeapons,
    isWheelOpen,
    weaponConfigs: WEAPON_CONFIGS,
    setActiveWeapon: handleSetActiveWeapon,
    unlockWeapon,
    toggleWeaponWheel,
    setWheelOpen,
    getUnlockedWeapons,
    isWeaponUnlocked
  };

  return (
    <WeaponContext.Provider value={value}>
      {children}
    </WeaponContext.Provider>
  );
};

// Custom hook to use weapon context
export const useWeapon = (): WeaponContextState => {
  const context = useContext(WeaponContext);
  if (context === undefined) {
    throw new Error('useWeapon must be used within a WeaponProvider');
  }
  return context;
};

export default WeaponContext;