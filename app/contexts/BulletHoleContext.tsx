import React, { createContext, useState, useCallback } from 'react';

interface BulletHole {
  id: number;
  x: number;
  y: number;
}

interface BulletHoleContextType {
  bulletHoles: BulletHole[];
  addBulletHole: (x: number, y: number) => void;
  addBurstHoles: (x: number, y: number) => void;
}

export const BulletHoleContext = createContext<BulletHoleContextType | undefined>(undefined);

export const BulletHoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bulletHoles, setBulletHoles] = useState<BulletHole[]>([]);

  const addBulletHole = useCallback((x: number, y: number) => {
    const newHole = { id: Date.now(), x, y };
    setBulletHoles(prev => [...prev, newHole]);
    setTimeout(() => {
      setBulletHoles(prev => prev.filter(hole => hole.id !== newHole.id));
    }, 5000);
  }, []);

  const addBurstHoles = useCallback((x: number, y: number) => {
    const burstInterval = 1100 / 5; // 1.1 seconds divided by 5 shots
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const newHole = {
          id: Date.now() + i,
          x: x - 10 + Math.random() * 20,
          y: y - 10 + Math.random() * 20
        };
        setBulletHoles(prev => [...prev, newHole]);
        setTimeout(() => {
          setBulletHoles(prev => prev.filter(hole => hole.id !== newHole.id));
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