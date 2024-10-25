import React, { useState, useEffect, useRef } from 'react';

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
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const contentContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    import('gsap').then(() => {
      setGsapLoaded(true);
    });
  }, []);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  useEffect(() => {
    if (!gsapLoaded || openIndex === null) return;

    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;
      
      const currentContainer = contentContainerRefs.current[openIndex];
      if (!currentContainer) return;

      // Get all lines within the container
      const lines = currentContainer.querySelectorAll('.content-line');
      
      // Reset all lines to initial state
      gsap.set(lines, { 
        opacity: 0,
        y: 15
      });

      // Animate lines
      gsap.to(lines, {
        opacity: 1,
        y: 0,
        duration: 0.35,
        stagger: 0.06,
        ease: "power2.out"
      });
    });
  }, [gsapLoaded, openIndex]);

  const splitContentIntoLines = (content: string) => {
    // First split into paragraphs
    return content.split('\n').map(paragraph => {
      // Then split each paragraph into sentences
      return paragraph.split(/(?<=\.)/).filter(line => line.trim());
    }).filter(paragraph => paragraph.length > 0);
  };

  return (
    <section className="services-section py-16 bg-contrast-higher color-bg no-bullet-holes">
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
                  <div 
                    ref={el => contentContainerRefs.current[index] = el}
                    className="content-container"
                  >
                    {splitContentIntoLines(service.content).map((paragraph, pIndex) => (
                      <div key={pIndex} className="mb-4 last:mb-0">
                        {paragraph.map((line, lIndex) => (
                          <div 
                            key={`${pIndex}-${lIndex}`}
                            className="content-line opacity-0 inline"
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
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
