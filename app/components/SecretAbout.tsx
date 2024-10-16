import React from 'react';
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
}

interface SecretAboutProps {
  secretAboutData: SecretAboutData;
}

const SecretAbout: React.FC<SecretAboutProps> = ({ secretAboutData }) => {
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
          <div className="relative">
            <img
              src={urlFor(secretAboutData.image).width(600).height(600).url()}
              alt={secretAboutData.title}
              className="w-full h-auto secret-image"
            />
            <div className="tape absolute left-0 transform -rotate-12 -translate-x-1/6 -translate-y-1/6">
              <img src="/images/tape.png" alt="Tape" className="w-64 lg:w-96 h-auto" />
            </div>
            <div className="tape absolute right-0 transform rotate-6 translate-x-1/6 -translate-y-1/6">
              <img src="/images/tape.png" alt="Tape" className="w-48 lg:w-96 h-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecretAbout;
