import React, { createContext, useContext, useState, ReactNode } from 'react';

// Weapon types enum
export enum WeaponType {
  DEFAULT = 'default',
  REVOLVER = 'revolver',
  SHOTGUN = 'shotgun',
  DYNAMITE = 'dynamite'
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
  const [unlockedWeapons, setUnlockedWeapons] = useState<Set<WeaponType>>(
    new Set([WeaponType.DEFAULT, WeaponType.REVOLVER, WeaponType.SHOTGUN, WeaponType.DYNAMITE]) // Show all weapons immediately
  );
  const [isWheelOpen, setIsWheelOpen] = useState(false);

  const unlockWeapon = (weapon: WeaponType) => {
    console.log('🔓 Unlocking weapon:', weapon);
    setUnlockedWeapons(prev => new Set([...prev, weapon]));
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