import React from 'react';

interface Partner {
  _id: string;
  name: string;
  logo: {
    asset: {
      _id: string;
      url: string;
    };
  };
}

interface PartnersSectionProps {
  partners: Partner[];
}

const PartnerShape: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width="100%" height="100%" viewBox="0 0 335 226" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 29.494C16.2891 29.494 29.494 16.2891 29.494 0H304.771C304.771 16.2891 317.976 29.494 334.265 29.494V196.506C317.976 196.506 304.771 209.711 304.771 226H29.494C29.494 209.711 16.2891 196.506 0 196.506V29.494Z" fill="#1A1917"/>
    {children}
  </svg>
);

const PartnersSection: React.FC<PartnersSectionProps> = ({ partners }) => {
  console.log('Partners data:', partners); // Debugging: Log partners data

  return (
    <section className="light-section py-16">
      <div className="container mx-auto px-4">
        <h2 className="eyebrow mb-8">OUR PARTNERS</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {partners && partners.map((partner) => (
            <div key={partner._id} className="aspect-w-3 aspect-h-2 relative">
              <PartnerShape>
                {partner.logo && partner.logo.asset && partner.logo.asset.url ? (
                  <image
                    href={partner.logo.asset.url}
                    x="10%"
                    y="10%"
                    width="80%"
                    height="80%"
                    preserveAspectRatio="xMidYMid meet"
                  />
                ) : (
                  <text x="50%" y="50%" textAnchor="middle" fill="white">Logo not found</text>
                )}
              </PartnerShape>
              {/* Debugging: Display partner name */}
              {/* <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1">
                {partner.name}
              </div> */}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
