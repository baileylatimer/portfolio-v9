import React from 'react';
import { PortableText, PortableTextProps } from '@portabletext/react';

interface RichTextContentProps {
  content: PortableTextProps['value'];
}

const RichTextContent: React.FC<RichTextContentProps> = ({ content }) => {
  return (
    <div className="rich-text-content">
      <PortableText
        value={content}
        components={{
          types: {
            image: ({ value }: { value: { asset: { url: string }, alt?: string } }) => (
              <img src={value.asset.url} alt={value.alt || ''} className="w-full h-auto my-4" />
            ),
          },
        }}
      />
    </div>
  );
};

export default RichTextContent;
