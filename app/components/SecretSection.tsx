import React from 'react';

interface SecretSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

const SecretSection: React.FC<SecretSectionProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg max-w-2xl w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Secret Section</h2>
        <p className="mb-4">This is the secret content that only appears when triggered.</p>
        <button
          onClick={onClose}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SecretSection;
