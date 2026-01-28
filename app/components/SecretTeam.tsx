import React, { useEffect, useRef } from 'react';
import imageUrlBuilder from '@sanity/image-url';
import { createClient } from '@sanity/client';
import PixelizeImage from './PixelizeImage';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { useWeapon, WeaponType } from '~/contexts/WeaponContext';

const client = createClient({
  projectId: 'hv36fjce',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const builder = imageUrlBuilder(client);

function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

interface TeamMember {
  _id: string;
  name: string;
  image: SanityImageSource;
  bio: string;
  websiteUrl?: string;
  instagramUrl?: string;
  order: number;
}

interface SecretTeamProps {
  teamMembers: TeamMember[];
}

const SecretTeam: React.FC<SecretTeamProps> = ({ teamMembers }) => {
  const sortedTeamMembers = [...teamMembers].sort((a, b) => a.order - b.order);
  const { unlockWeapon, isWeaponUnlocked } = useWeapon();
  const easterEggTriggered = useRef(false);

  useEffect(() => {
    const handleShatterEvent = (event: CustomEvent) => {
      console.log('🎯 EASTER EGG DEBUG: Shatter event received', event);
      console.log('🎯 event.target type:', typeof event.target, event.target);
      console.log('🎯 event.detail:', event.detail);
      
      // Extract coordinates from event detail
      const { x, y } = event.detail || {};
      console.log('🎯 Shot coordinates:', { x, y });
      
      if (!x || !y) {
        console.log('🎯 No coordinates in event detail, skipping');
        return;
      }
      
      // Use elementFromPoint to find the element at the shot coordinates
      const elementAtPoint = document.elementFromPoint(x, y);
      console.log('🎯 Element at shot point:', elementAtPoint);
      
      if (!elementAtPoint) {
        console.log('🎯 No element found at coordinates');
        return;
      }
      
      // Find the member container by traversing up the DOM
      const memberContainer = elementAtPoint.closest('[data-member-index]');
      console.log('🎯 Member container found:', memberContainer);
      
      if (memberContainer) {
        const memberIndex = parseInt(memberContainer.getAttribute('data-member-index') || '0');
        console.log('🎯 Member index:', memberIndex);
        
        // Check if it's the 3rd member (index 2, since 0-based)
        if (memberIndex === 2 && !easterEggTriggered.current && !isWeaponUnlocked(WeaponType.RAYGUN)) {
          console.log('🎉 EASTER EGG TRIGGERED! Brother shot, unlocking raygun!');
          easterEggTriggered.current = true;
          
          // Unlock the raygun
          unlockWeapon(WeaponType.RAYGUN);
          
          // Add special visual effects
          const memberElement = memberContainer as HTMLElement;
          
          // Flash effect
          memberElement.style.animation = 'flash 0.5s ease-in-out 3';
          
          // Create unlock notification
          const notification = document.createElement('div');
          notification.textContent = '✨ RAY GUN UNLOCKED! ✨';
          notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #00ff00, #ffff00);
            padding: 20px 40px;
            border-radius: 10px;
            font-family: 'Monaco', monospace;
            font-size: 24px;
            font-weight: bold;
            color: black;
            z-index: 10000;
            animation: pulse 2s ease-in-out;
            box-shadow: 0 0 30px rgba(0,255,0,0.8);
          `;
          
          document.body.appendChild(notification);
          
          // Remove notification after animation
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 3000);
          
          console.log('🚀 Raygun unlocked! Check the weapon wheel!');
        } else {
          console.log('🎯 Wrong member index or already unlocked:', { memberIndex, easterEggTriggered: easterEggTriggered.current, raygunUnlocked: isWeaponUnlocked(WeaponType.RAYGUN) });
        }
      } else {
        console.log('🎯 No member container found at shot coordinates');
      }
    };

    // Listen for shatter events on the document
    document.addEventListener('shatter-image', handleShatterEvent as EventListener);
    
    return () => {
      document.removeEventListener('shatter-image', handleShatterEvent as EventListener);
    };
  }, [unlockWeapon, isWeaponUnlocked]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ">
      {sortedTeamMembers.map((member, index) => (
        <div key={member._id} className="flex flex-col mt-24" data-member-index={index}>
          {member.image && (
            <div className='relative'>
              <PixelizeImage
                src={urlFor(member.image).width(600).height(600).url()}
                alt={member.name}
                className="object-cover mb-4 secret-image"
                inOverlay={true}
              />
              <div className="tape absolute left-0 transform -rotate-12 -translate-x-1/6 -translate-y-1/6">
                <img src="/images/tape.png" alt="Tape" className="w-64 lg:w-96 h-auto" />
              </div>
              <div className="tape absolute right-0 transform rotate-6 translate-x-1/6 -translate-y-1/6">
                <img src="/images/tape.png" alt="Tape" className="w-48 lg:w-96 h-auto" />
              </div>
            </div>
          )}
          <h3 className="text-xl font-bold mb-2 font-thermal" style={{ color: '#18F710' }}>
            {member.name}
          </h3>
          <p className="mb-4 font-thermal" style={{ color: '#18F710' }}>{member.bio}</p>
          <div className="flex space-x-4">
            {member.websiteUrl && (
              <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:opacity-80 uppercase px-2 py-1 rounded font-thermal secret-pill" style={{ color: '#18F710' }}>
                Website
              </a>
            )}
            {member.instagramUrl && (
              <a href={member.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:opacity-80 uppercase px-2 py-1 rounded font-thermal secret-pill flex items-center justify-center" style={{ color: '#18F710' }}>
                Instagram
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SecretTeam;
