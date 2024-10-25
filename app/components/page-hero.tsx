import React from 'react';

interface PageHeroProps {
  desktopImageSrc: string;
  mobileImageSrc: string;
  altText: string;
}

const PageHero: React.FC<PageHeroProps> = ({ desktopImageSrc, mobileImageSrc, altText }) => {
  return (
    <div className="w-full relative z-10 page-hero">
      <picture>
        <source media="(min-width: 768px)" srcSet={desktopImageSrc} />
        <source media="(max-width: 767px)" srcSet={mobileImageSrc} />
        <img src={desktopImageSrc} alt={altText} className="w-full h-auto" />
      </picture>
    </div>
  );
};

export default PageHero;
