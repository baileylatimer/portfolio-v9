import React, { createContext, useState, useCallback, useRef } from 'react';

interface BulletHole {
  id: number;
  x: number;
  y: number;
}

interface BulletHoleContextType {
  bulletHoles: BulletHole[];
  addBulletHole: (x: number, y: number, target: HTMLElement) => void;
  addBurstHoles: (x: number, y: number, target: HTMLElement) => void;
}

export const BulletHoleContext = createContext<BulletHoleContextType | undefined>(undefined);

export const BulletHoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bulletHoles, setBulletHoles] = useState<BulletHole[]>([]);
  const lastBulletHoleTime = useRef(0);

  const shouldAddBulletHole = (target: HTMLElement) => {
    return !target.closest('.no-bullet-holes');
  };

  const addBulletHole = useCallback((x: number, y: number, target: HTMLElement) => {
    if (!shouldAddBulletHole(target)) {
      console.log('Skipping bullet hole for no-bullet-holes element');
      return;
    }

    const now = Date.now();
    if (now - lastBulletHoleTime.current > 100) { // 100ms debounce
      lastBulletHoleTime.current = now;
      const newHole = { id: now, x, y };
      setBulletHoles(prev => [...prev, newHole]);
      console.log('Adding bullet hole:', newHole);
      setTimeout(() => {
        setBulletHoles(prev => prev.filter(hole => hole.id !== newHole.id));
        console.log('Removing bullet hole:', newHole);
      }, 5000);
    } else {
      console.log('Skipping bullet hole due to debounce');
    }
  }, []);

  const addBurstHoles = useCallback((x: number, y: number, target: HTMLElement) => {
    if (!shouldAddBulletHole(target)) {
      console.log('Skipping burst holes for no-bullet-holes element');
      return;
    }

    const burstInterval = 1100 / 5; // 1.1 seconds divided by 5 shots
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const newHole = {
          id: Date.now() + i,
          x: x - 10 + Math.random() * 20,
          y: y - 10 + Math.random() * 20
        };
        setBulletHoles(prev => [...prev, newHole]);
        console.log('Adding burst hole:', newHole);
        setTimeout(() => {
          setBulletHoles(prev => prev.filter(hole => hole.id !== newHole.id));
          console.log('Removing burst hole:', newHole);
        }, 5000);
      }, i * burstInterval);
    }
  }, []);

  return (
    <BulletHoleContext.Provider value={{ bulletHoles, addBulletHole, addBurstHoles }}>
      {children}
    </BulletHoleContext.Provider>
  );
};
