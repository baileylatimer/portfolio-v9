import React from 'react';
import { PortableText } from '@portabletext/react';

interface ImageWithTextProps {
  title: string;
  content: any[];
  image: {
    asset: {
      url: string;
    };
  };
  imageExcerpt: string;
}

const ImageWithText: React.FC<ImageWithTextProps> = ({ title, content, image, imageExcerpt }) => {
  return (
    <section className="py-12 px-4 md:px-0">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
            <h2 className="text-4xl font-bold mb-4">{title}</h2>
            <div className="prose">
              <PortableText
                value={content}
                components={{
                  block: {
                    normal: ({children}) => <p className="font-default">{children}</p>,
                    secondary: ({children}) => <p className="font-secondary">{children}</p>,
                  },
                }}
              />
            </div>
          </div>
          <div className="md:w-1/2 relative">
            <img src={image.asset.url} alt={title} className="w-full h-auto" />
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2">
              {imageExcerpt}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImageWithText;
