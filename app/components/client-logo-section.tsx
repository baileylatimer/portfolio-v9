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
  const columns = [
    sortedLogos.slice(0, 5),
    sortedLogos.slice(5, 9),
    sortedLogos.slice(9, 14),
    sortedLogos.slice(14, 18),
  ];

  return (
    <section className="py-12 px-4">
      <h2 className="text-3xl font-bold mb-8 text-center">RECENT CLIENTS</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="flex flex-col items-center space-y-8">
            {column.map((logo) => (
              <div key={logo._id} className="w-full flex justify-center">
                <img
                  src={logo.logo.asset.url}
                  alt={`${logo.name} logo`}
                  className="max-w-full h-auto max-h-16 object-contain"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ClientLogoSection;
