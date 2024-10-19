import React from 'react';
import { PortableText } from '@portabletext/react';
import PixelizeImage from './PixelizeImage';
import { PortableTextBlock } from '@portabletext/types';

interface ImageWithTextProps {
  title: string;
  content: PortableTextBlock[];
  image: {
    asset: {
      url: string;
    };
  };
  imageExcerpt: string;
}

const ImageWithText: React.FC<ImageWithTextProps> = ({ title, content, image, imageExcerpt }) => {
  return (
    <section className="py-12 px-4 md:px-0 light-section">
      <div className="container mx-auto light-section">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
            <h2 className="text-4xl font-bold mb-4">{title}</h2>
            <div className="prose">
              <PortableText
                value={content}
                components={{
                  block: {
                    normal: ({children}) => <p className="font-secondary">{children}</p>,
                    secondary: ({children}) => <p className="font-secondary">{children}</p>,
                  },
                }}
              />
            </div>
          </div>
          <div className="md:w-1/2 relative light-section">
            <div className="relative light-section">
              <PixelizeImage
                src={image.asset.url}
                alt={title}
                className="w-full h-auto"
              />
              <div className="tape absolute left-0 transform -rotate-12 -translate-x-1/6 -translate-y-1/6">
                <img src="/images/tape.png" alt="Tape" className="w-64 lg:w-96 h-auto" />
              </div>
              <div className="tape absolute right-0 transform rotate-6 translate-x-1/6 -translate-y-1/6">
                <img src="/images/tape.png" alt="Tape" className="w-48 lg:w-96 h-auto" />
              </div>
            </div>
            <div className="absolute bottom-4 right-4 color-bg uppercase p-2">
              {imageExcerpt}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImageWithText;
