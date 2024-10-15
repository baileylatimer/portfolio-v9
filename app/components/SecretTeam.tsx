import React from 'react';
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

interface TeamMember {
  _id: string;
  name: string;
  image: any;
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {sortedTeamMembers.map((member) => (
        <div key={member._id} className="flex flex-col items-center">
          {member.image && (
            <img
              src={urlFor(member.image).width(800).height(800).url()}
              alt={member.name}
              className="w-full h-auto  mb-4"
            />
          )}
          <h3 className="text-2xl font-bold mb-2 font-thermal" style={{ color: '#18F710' }}>{member.name}</h3>
          <p className="text-center mb-4 font-thermal" style={{ color: '#18F710' }}>{member.bio}</p>
          <div className="flex space-x-4">
            {member.websiteUrl && (
              <a href={member.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-lg hover:opacity-80 font-thermal" style={{ color: '#18F710' }}>
                Website
              </a>
            )}
            {member.instagramUrl && (
              <a href={member.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-lg hover:opacity-80 font-thermal" style={{ color: '#18F710' }}>
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
