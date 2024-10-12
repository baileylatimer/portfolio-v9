import React from 'react';
import Stars from '~/components/svg-stars';
import SvgCaFlag from '~/components/svg-ca-flag';
import SvgTarget from '~/components/svg-target';
import SvgGrid from '~/components/svg-grid';
import CustomButton from '~/components/custom-button';

const HERO_IMAGE_PATH = '/images/horse-hero--min.jpg';

interface HeroProps {
  bottomElementsScale?: number;
}

export default function Hero({ bottomElementsScale = 1 }: HeroProps) {
  const desktopStarWidth = 340 * bottomElementsScale;
  const desktopStarHeight = 71 * bottomElementsScale;
  const desktopFlagWidth = 143 * bottomElementsScale;
  const desktopFlagHeight = 44 * bottomElementsScale;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{backgroundImage: `url(${HERO_IMAGE_PATH})`}}
      />
      <div className="absolute inset-0 bg-black bg-opacity-20" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px),
                          repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.1) 39px, rgba(255,255,255,0.1) 40px)`
      }} />
      
      {/* Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-t from-black to-transparent" />
      
      {/* Target SVG */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 scale-50 md:scale-100">
        <SvgTarget />
      </div>
      
      {/* Grid SVG */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 scale-50 md:scale-100">
        <SvgGrid />
      </div>
      
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <CustomButton onClick={() => console.log("Let's talk clicked")}>
          LET'S TALK
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