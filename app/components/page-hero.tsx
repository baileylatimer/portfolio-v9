import React from 'react';

interface PageHeroProps {
  imageSrc: string;
  altText: string;
}

const PageHero: React.FC<PageHeroProps> = ({ imageSrc, altText }) => {
  return (
    <div className="w-full">
      <img src={imageSrc} alt={altText} className="w-full h-auto" />
    </div>
  );
};

export default PageHero;
