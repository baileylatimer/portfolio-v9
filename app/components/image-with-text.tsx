import React from 'react';
import ShatterableImage from './ShatterableImage';
import ShatterableText from './ShatterableText';
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
  // Helper function to extract plain text from PortableText blocks
  const extractPlainText = (blocks: PortableTextBlock[]): string => {
    if (!blocks || !Array.isArray(blocks)) return '';
    
    return blocks
      .filter(block => block._type === 'block')
      .map(block => {
        if ('children' in block && Array.isArray(block.children)) {
          return block.children
            .filter(child => child._type === 'span' && typeof child.text === 'string')
            .map(child => child.text)
            .join('');
        }
        return '';
      })
      .join(' ');
  };

  const plainTextContent = extractPlainText(content);

  return (
    <section className="py-12 px-4 md:px-0 light-section">
      <div className="container mx-auto light-section">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
            {/* Destructible title */}
            <h2 className="text-4xl font-bold mb-4">
              <ShatterableText
                text={title}
                id="about-title"
                className="inline"
              />
            </h2>
            {/* Destructible content */}
            <div className="prose">
              <div className="font-secondary">
                <ShatterableText
                  text={plainTextContent}
                  id="about-content"
                  className="inline"
                />
              </div>
            </div>
          </div>
          <div className="md:w-1/2 relative light-section">
            <div className="relative light-section">
              <ShatterableImage
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
