import React from 'react';

interface ClientLogo {
  _id: string;
  name: string;
  logo: {
    asset: {
      url: string;
    };
  };
  order: number;
}

interface ClientLogoSectionProps {
  logos: ClientLogo[];
}

const ClientLogoSection: React.FC<ClientLogoSectionProps> = ({ logos }) => {
  const sortedLogos = logos.sort((a, b) => a.order - b.order);

  return (
    <section className="py-12 px-4 light-section">
      <h2 className="eyebrow mb-8 lg:ml-24 ">RECENT CLIENTS</h2>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-8">
        {sortedLogos.map((logo) => (
          <div key={logo._id} className="flex justify-center items-center">
            <img
              src={logo.logo.asset.url}
              alt={`${logo.name} logo`}
              className="max-w-full h-auto max-h-16 object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  );
};

export default ClientLogoSection;
