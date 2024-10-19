import React from 'react';
import imageUrlBuilder from '@sanity/image-url';
import { createClient } from '@sanity/client';
import PixelizeImage from './PixelizeImage';
import { SanityImageSource } from '@sanity/image-url/lib/types/types';

const client = createClient({
  projectId: 'hv36fjce',
  dataset: 'production',
  useCdn: false,
  apiVersion: '2023-05-03',
});

const builder = imageUrlBuilder(client);

function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

interface TeamMember {
  _id: string;
  name: string;
  image: SanityImageSource;
  bio: string;
  websiteUrl?: string;
  instagramUrl?: string;
  order: number;
}

interface SecretTeamProps {
  teamMembers: TeamMember[];
}

const SecretTeam: React.FC<SecretTeamProps> = ({ teamMembers }) => {
  const sortedTeamMembers = [...teamMembers].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 ">
      {sortedTeamMembers.map((member) => (
        <div key={member._id} className="flex flex-col mt-24">
          {member.image && (
            <div className='relative'>
              <PixelizeImage
                src={urlFor(member.image).width(600).height(600).url()}
                alt={member.name}
                className="object-cover mb-4 secret-image"
                inOverlay={true}
              />
              <div className="tape absolute left-0 transform -rotate-12 -translate-x-1/6 -translate-y-1/6">
                <img src="/images/tape.png" alt="Tape" className="w-64 lg:w-96 h-auto" />
              </div>
              <div className="tape absolute right-0 transform rotate-6 translate-x-1/6 -translate-y-1/6">
                <img src="/images/tape.png" alt="Tape" className="w-48 lg:w-96 h-auto" />
              </div>
            </div>
          )}
          <h3 className="text-xl font-bold mb-2 font-thermal" style={{ color: '#18F710' }}>{member.name}</h3>
          <p className="mb-4 font-thermal" style={{ color: '#18F710' }}>{member.bio}</p>
          <div className="flex space-x-4">
            {member.websiteUrl && (
              <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:opacity-80 uppercase px-2 py-1 rounded font-thermal secret-pill" style={{ color: '#18F710' }}>
                Website
              </a>
            )}
            {member.instagramUrl && (
              <a href={member.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm hover:opacity-80 uppercase px-2 py-1 rounded font-thermal secret-pill flex items-center justify-center" style={{ color: '#18F710' }}>
                Instagram
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SecretTeam;
