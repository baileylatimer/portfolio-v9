import React, { useState, useEffect, useRef } from 'react';
import { PortableText } from '@portabletext/react';
import imageUrlBuilder from '@sanity/image-url';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'hv36fjce',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const builder = imageUrlBuilder(client);

function urlFor(source: any) {
  return builder.image(source);
}

interface SecretAboutData {
  title: string;
  content: any[];
  image: any;
  armorImage?: any;
}

interface SecretAboutProps {
  secretAboutData: SecretAboutData;
}

const SecretAbout: React.FC<SecretAboutProps> = ({ secretAboutData }) => {
  const [showArmorImage, setShowArmorImage] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const dramaticAudioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Initialize dramatic sound effect
    dramaticAudioRef.current = new Audio('/sounds/dramatic.mp3');
    dramaticAudioRef.current.volume = 0.7;
    dramaticAudioRef.current.preload = 'auto';

    const handleShatterEvent = (event: CustomEvent) => {
      console.log('🛡️ ARMOR DEBUG: Shatter event received', event);
      
      // Only proceed if we have armor image and haven't already transformed
      if (!secretAboutData.armorImage || showArmorImage) {
        console.log('🛡️ No armor image or already transformed');
        return;
      }

      // Extract coordinates from event detail
      const { x, y } = event.detail || {};
      console.log('🛡️ Shot coordinates:', { x, y });
      
      if (!x || !y) {
        console.log('🛡️ No coordinates in event detail');
        return;
      }
      
      // Check if shot hit the image
      const elementAtPoint = document.elementFromPoint(x, y);
      console.log('🛡️ Element at shot point:', elementAtPoint);
      
      if (!elementAtPoint) {
        console.log('🛡️ No element found at coordinates');
        return;
      }
      
      // Check if the shot hit our image or its container
      const hitTheImage = elementAtPoint === imageRef.current || 
                         elementAtPoint.closest('.secret-about-image-container') !== null;
      
      console.log('🛡️ Hit the image?', hitTheImage);
      
      if (hitTheImage) {
        console.log('🛡️ ARMOR ACTIVATED! You cannot touch me!');
        
        // Play dramatic sound effect
        if (dramaticAudioRef.current) {
          dramaticAudioRef.current.currentTime = 0;
          dramaticAudioRef.current.play().catch(err => console.warn('Dramatic sound failed:', err));
        }
        
        // Trigger transition effect
        setIsTransitioning(true);
        
        // After brief delay, swap to armor image
        setTimeout(() => {
          setShowArmorImage(true);
          setIsTransitioning(false);
        }, 200);
        
        // Create visual effect notification
        const notification = document.createElement('div');
        notification.textContent = 'Nice try.';
        notification.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #18F710;
          padding: 20px 40px;
          font-family: 'Thermal', sans-serif;
          font-size: 20px;
          font-weight: bold;
          color: black;
          z-index: 10000;
          animation: bounce 0.6s ease-in-out 3;
          box-shadow: 0 0 30px rgba(24, 247, 16, 0.8);
          border: 3px solid #0a5c0a;
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after animation
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 2000);
      }
    };

    // Listen for shatter events
    document.addEventListener('shatter-image', handleShatterEvent as EventListener);
    
    return () => {
      document.removeEventListener('shatter-image', handleShatterEvent as EventListener);
    };
  }, [secretAboutData.armorImage, showArmorImage]);

  // Determine which image to show
  const currentImageSrc = (showArmorImage && secretAboutData.armorImage) 
    ? urlFor(secretAboutData.armorImage).width(600).height(600).url()
    : urlFor(secretAboutData.image).width(600).height(600).url();

  return (
    <div className="mt-16">
      <div className="flex flex-col md:flex-row gap-8 mt-48 mb-24">
        <div className="md:w-1/2">
          <h2 className="text-3xl font-bold mb-8 font-thermal mb-12 w-full " style={{ color: '#18F710' }}>{secretAboutData.title}</h2>
          <div className="font-thermal text-xl" style={{ color: '#18F710' }}>
            <PortableText
              value={secretAboutData.content}
              components={{
                block: {
                  normal: ({children}) => <p className="mb-4">{children}</p>,
                },
              }}
            />
            <h2 className='font-bold font-thermal'>Bailey Latimer</h2>
          </div>
        </div>
        <div className="md:w-1/2 mt-16 lg:mt-0">
          <div className="relative secret-about-image-container overflow-hidden">
            <div className="relative overflow-hidden">
              <img
                ref={imageRef}
                src={currentImageSrc}
                alt={showArmorImage ? "Bailey in medieval armor - untouchable!" : secretAboutData.title}
                className={`w-full h-auto secret-image transition-all duration-300 relative z-10 ${
                  isTransitioning ? 'brightness-200 scale-105' : ''
                } ${
                  showArmorImage ? 'drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]' : ''
                }`}
                style={{
                  filter: showArmorImage 
                    ? 'brightness(1.1) contrast(1.1) drop-shadow(0 0 10px rgba(255,255,255,0.5))'
                    : undefined
                }}
              />
              
              {/* Armor shimmer effect when transformed - positioned exactly over the image */}
              {showArmorImage && (
                <div 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none z-20"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                    animation: 'shimmer 2s ease-in-out infinite'
                  }}
                />
              )}
            </div>
            
            <div className="tape absolute left-0 transform -rotate-12 -translate-x-1/6 -translate-y-1/6 z-30">
              <img src="/images/tape.png" alt="Tape" className="w-64 lg:w-96 h-auto" />
            </div>
            <div className="tape absolute right-0 transform rotate-6 translate-x-1/6 -translate-y-1/6 z-30">
              <img src="/images/tape.png" alt="Tape" className="w-48 lg:w-96 h-auto" />
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS for shimmer animation */}
      {showArmorImage && (
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
          @keyframes bounce {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.15); }
          }
        `}</style>
      )}
    </div>
  );
};

export default SecretAbout;
