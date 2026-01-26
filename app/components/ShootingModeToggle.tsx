import React from 'react';
import { useShootingMode } from '~/contexts/ShootingModeContext';
import CustomButton from './custom-button';

const ShootingModeToggle: React.FC = () => {
  const { isShootingMode, toggleShootingMode } = useShootingMode();

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <CustomButton 
        onClick={toggleShootingMode}
        className="uppercase transition-all duration-300"
        fill="on"
      >
        {isShootingMode ? (
          <>HOLSTER</>
        ) : (
          <>SHOOT</>
        )}
      </CustomButton>
    </div>
  );
};

export default ShootingModeToggle;