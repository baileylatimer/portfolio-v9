import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import Stars from '~/components/svg-stars';
import SvgCaFlag from '~/components/svg-ca-flag';
import SvgTarget from '~/components/svg-target';
import SvgGrid from '~/components/svg-grid';
import CustomButton from '~/components/custom-button';
import { useOutletContext } from '@remix-run/react';
import AsciiVideo from '~/components/AsciiVideo';
import AsciiImage from '~/components/AsciiImage';
import { useAsciiMode } from '~/contexts/AsciiModeContext';

interface HeroProps {
  bottomElementsScale?: number;
  mediaUrl: string;
  posterImageUrl?: string;
}

interface OutletContextType {
  openSecretSection: () => void;
}

export default function Hero({ bottomElementsScale = 1, mediaUrl, posterImageUrl }: HeroProps) {
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const desktopStarWidth = 340 * bottomElementsScale;
  const desktopStarHeight = 71 * bottomElementsScale;
  const desktopFlagWidth = 143 * bottomElementsScale;
  const desktopFlagHeight = 44 * bottomElementsScale;
  const navigate = useNavigate();
  const { asciiMode } = useAsciiMode();

  const { openSecretSection } = useOutletContext<OutletContextType>();
  const isVideo = mediaUrl?.endsWith('.mp4') || mediaUrl?.endsWith('.webm');

  console.log("Hero component rendered, openSecretSection:", openSecretSection);

  // Handle video loading
  useEffect(() => {
    if (isVideo && videoRef.current && posterImageUrl) {
      const video = videoRef.current;
      
      const handleCanPlayThrough = () => {
        console.log('📹 Video loaded, transitioning from poster');
        setTimeout(() => setVideoLoaded(true), 100); // Small delay for smooth transition
      };

      video.addEventListener('canplaythrough', handleCanPlayThrough);
      
      return () => {
        video.removeEventListener('canplaythrough', handleCanPlayThrough);
      };
    }
  }, [isVideo, posterImageUrl]);

  const handleTargetClick = useCallback((e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("Target in hero section clicked");
    if (openSecretSection) {
      openSecretSection();
    } else {
      console.error("openSecretSection is undefined");
    }
  }, [openSecretSection]);

  return (
    <div className="hero-section relative h-screen w-full overflow-hidden">
      {/* Background Media */}
      {isVideo ? (
        asciiMode ? (
          <AsciiVideo
            src={mediaUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <>
            {/* Poster Image - Shows immediately for fast loading */}
            {posterImageUrl && !videoLoaded && (
              <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-out"
                style={{ backgroundImage: `url('${posterImageUrl}')` }}
              />
            )}
            
            {/* Video - Hidden until loaded, then fades in */}
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out ${
                videoLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            >
              <source src={mediaUrl} type="video/mp4" />
              <track kind="captions" />
            </video>
          </>
        )
      ) : (
        asciiMode ? (
          <AsciiImage
            src={mediaUrl}
            alt="Hero background"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{backgroundImage: `url('${mediaUrl}')`}}
          />
        )
      )}
      
      <div className="absolute inset-0 bg-black bg-opacity-20" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px),
                          repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px)`
      }} />
      
      {/* Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-t from-black to-transparent" />
      
      {/* Target SVG */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 scale-50 md:scale-100 z-50">
        <SvgTarget color="var(--color-bg)" onClick={handleTargetClick}/>
      </div>
      
      {/* Grid SVG */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 scale-50 md:scale-100">
        <SvgGrid />
      </div>
      
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <CustomButton onClick={() => navigate('/contact')}>
          LET&apos;S TALK
        </CustomButton>
      </div>
      
      {/* Bottom elements */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-between items-end px-4">
        <div className="scale-50 md:scale-100 origin-bottom-left">
          <Stars width={desktopStarWidth} height={desktopStarHeight} color="#FF0000"/>
        </div>
        <div className="scale-50 md:scale-100  transform -translate-x-2/4 md:translate-x-0">
          <SvgCaFlag width={desktopFlagWidth} height={desktopFlagHeight} />
        </div>
        <div className="hidden md:block scale-50 md:scale-100 origin-bottom-right ">
          <div className="scale-x-[-1]">
            <Stars width={desktopStarWidth} height={desktopStarHeight} color="#FF0000"/>
          </div>
        </div>
      </div>
    </div>
  );
}
