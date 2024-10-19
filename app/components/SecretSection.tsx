import React from 'react';
import SecretTeam from './SecretTeam';
import SecretAbout from './SecretAbout';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { PortableTextBlock } from '@portabletext/types';

interface TeamMember {
  _id: string;
  name: string;
  image: SanityImageSource;
  bio: string;
  websiteUrl?: string;
  instagramUrl?: string;
  order: number;
}

interface SecretAboutData {
  title: string;
  content: PortableTextBlock[];
  tools: string[];
  image: SanityImageSource;
}

interface SecretSectionProps {
  isOpen: boolean;
  onClose: () => void;
  teamMembers: TeamMember[];
  secretAboutData: SecretAboutData;
}

const SecretSection: React.FC<SecretSectionProps> = ({ isOpen, onClose, teamMembers, secretAboutData }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden"
      style={{ backgroundColor: 'var(--color-contrast-higher)' }}
    >
      <div className="relative w-full h-full flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 hover:opacity-80 transition-opacity z-10"
          aria-label="Close"
        >
          <svg width="23" height="24" viewBox="0 0 23 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 2V0.5H1.5V2H0ZM21 2V0.5H22.5V2H21ZM0 5V3.5H1.5V5H0ZM21 5V3.5H22.5V5H21ZM1.5 8V6.5H3V8H1.5ZM19.5 8V6.5H21V8H19.5ZM7.5 13V11.5H15V13H7.5ZM1.5 18V16.5H3V18H1.5ZM19.5 18V16.5H21V18H19.5ZM0 21V19.5H1.5V21H0ZM21 21V19.5H22.5V21H21ZM0 24V22.5H1.5V24H0ZM21 24V22.5H22.5V24H21Z" fill="#18F710"/>
            <path d="M4 9V10.5H5.5V9H4Z" fill="#18F710"/>
            <path d="M16.5 9V10.5H18V9H16.5Z" fill="#18F710"/>
            <path d="M16.5 14V15.5H18V14H16.5Z" fill="#18F710"/>
            <path d="M4 14V15.5H5.5V14H4Z" fill="#18F710"/>
          </svg>
        </button>
        <div className="overflow-y-auto flex-grow p-8">
          <div className="mx-auto">
            <h2 className="text-4xl font-bold mb-8 font-thermal" style={{ color: '#18F710' }}>You found the secret page</h2>
            <p className="mb-8 text-xl font-thermal" style={{ color: '#18F710' }}>
              I bet you cheated to get here, huh? Anyways, here&apos;s some people and tools that made building this site possible.
            </p>
       
            <SecretTeam teamMembers={teamMembers} />
            <SecretAbout secretAboutData={secretAboutData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretSection;
