import React, { useState } from 'react';

interface Service {
  _id: string;
  title: string;
  content: string;
}

interface ServicesSectionProps {
  services: Service[];
}

const ServicesSection: React.FC<ServicesSectionProps> = ({ services }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-16 bg-contrast-higher text-white">
      <div className="container mx-auto px-4">
        <h2 className="eyebrow mb-8">SERVICES</h2>
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={service._id} className="border-b border-dashed border-white last:border-b-0">
              <button
                className="w-full text-left py-4 flex justify-between items-center focus:outline-none"
                onClick={() => toggleAccordion(index)}
              >
                <span className="font-default uppercase">{service.title}</span>
                <span className="text-2xl">{openIndex === index ? '-' : '+'}</span>
              </button>
              {openIndex === index && (
                <div className="pb-4">
                  <p className=''>{service.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
