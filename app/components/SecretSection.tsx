import React from 'react';

interface SecretSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

const SecretSection: React.FC<SecretSectionProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto secret-section"
      style={{ backgroundColor: 'var(--color-contrast-higher)' }}
    >
      <div className="relative w-full h-full p-8 flex flex-col items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-4xl font-bold hover:opacity-80 transition-opacity"
          style={{ color: '#18F710' }}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="mb-8 font-thermal font-bold" style={{ color: '#18F710' }}>You found the secret page</h2>
        <p className="mb-8 text-xl text-center font-thermal" style={{ color: '#18F710' }}>
        I bet you cheated to get here, huh? anyways, here’s some people and tools that made building this site possible.
        </p>
      </div>
    </div>
  );
};

export default SecretSection;
