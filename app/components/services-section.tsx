/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from 'react';
import PixelizeImage, { PixelizeImageRef } from './PixelizeImage';
import PlusMinusToggle from './plus-minus-toggle';

interface ServiceMedia {
  type?: 'image' | 'video';
  image?: {
    _ref: string;
    url: string;
  };
  video?: {
    _ref: string;
    url: string;
  };
  alt?: string;
}

interface Service {
  _id: string;
  title: string;
  content: string;
  media?: ServiceMedia;
}

interface ServicesSectionProps {
  services: Service[];
}

const ServicesSection: React.FC<ServicesSectionProps> = ({ services }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const contentContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<{ [key: string]: PixelizeImageRef | null }>({});
  const serviceRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tabContentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const initGSAP = async () => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      setGsapLoaded(true);

      // Set initial state for all service items
      serviceRefs.current.forEach((ref, index) => {
        if (ref) {
          gsap.set(ref, { 
            opacity: 0,
            y: 15
          });

          // Create scroll trigger for each service
          ScrollTrigger.create({
            trigger: ref,
            start: 'top bottom-=50',
            onEnter: () => {
              gsap.to(ref, {
                opacity: 1,
                y: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: index * 0.15
              });
            },
            once: true // Only trigger once when scrolling down
          });
        }
      });

      // Initialize tab content heights
      tabContentRefs.current.forEach(ref => {
        if (ref) {
          gsap.set(ref, {
            height: 0,
            opacity: 0,
            display: 'none'
          });
        }
      });
    };

    initGSAP();

    return () => {
      if (typeof window !== 'undefined') {
        import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
          ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        });
      }
    };
  }, []);

  const animateTabContent = async (index: number, isOpening: boolean) => {
    if (!gsapLoaded) return;

    const { gsap } = await import('gsap');
    const content = tabContentRefs.current[index];
    if (!content) return;

    // Show content before measuring height
    if (isOpening) {
      gsap.set(content, {
        display: 'block',
        height: 'auto',
        opacity: 0
      });
    }

    // Get the natural height
    const height = content.scrollHeight;

    // Create timeline for smooth animation
    const tl = gsap.timeline({
      onComplete: () => {
        if (!isOpening) {
          gsap.set(content, { display: 'none' });
        }
      }
    });

    if (isOpening) {
      tl.fromTo(content, 
        { height: 0, opacity: 0 },
        { height, opacity: 1, duration: 0.5, ease: 'power2.inOut' }
      ).set(content, { height: 'auto' });
    } else {
      tl.to(content, {
        height: 0,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.inOut'
      });
    }
  };

  const toggleAccordion = (index: number) => {
    const isOpening = openIndex !== index;
    
    // Close current tab if open
    if (openIndex !== null) {
      animateTabContent(openIndex, false);
    }

    // Open new tab or close current
    if (isOpening) {
      setOpenIndex(index);
      animateTabContent(index, true);
    } else {
      setOpenIndex(null);
    }
  };

  // Effect to handle image depixelization when tab opens
  useEffect(() => {
    if (openIndex !== null) {
      const service = services[openIndex];
      if (service.media?.type === 'image') {
        const timer = setTimeout(() => {
          const imageRef = imageRefs.current[service._id];
          if (imageRef) {
            imageRef.triggerDepixelize();
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [openIndex, services]);

  useEffect(() => {
    if (!gsapLoaded || openIndex === null) return;

    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;
      
      const currentContainer = contentContainerRefs.current[openIndex];
      if (!currentContainer) return;

      const lines = currentContainer.querySelectorAll('.content-line');
      
      gsap.set(lines, { 
        opacity: 0,
        y: 15
      });

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
    return content.split('\n').map(paragraph => {
      return paragraph.split(/(?<=\.)/).filter(line => line.trim());
    }).filter(paragraph => paragraph.length > 0);
  };

  const getMediaContent = (service: Service) => {
    if (!service.media) return null;

    const { type, image, video, alt } = service.media;

    if (type === 'video' && video?.url) {
      return (
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={video.url} type="video/mp4" />
        </video>
      );
    }

    if (type === 'image' && image?.url) {
      return (
        <PixelizeImage
          ref={ref => imageRefs.current[service._id] = ref}
          src={image.url}
          alt={alt || service.title}
          className="w-full h-full object-cover"
          manualTrigger={true}
        />
      );
    }

    return null;
  };

  return (
    <section className="services-section py-16 bg-contrast-higher color-bg no-bullet-holes">
      <div className="container mx-auto px-4">
        <h2 className="eyebrow mb-8">SERVICES</h2>
        <div className="space-y-4 cursor-pointer">
          {services.map((service, index) => (
            <div 
              key={service._id} 
              ref={el => serviceRefs.current[index] = el}
              className="border-b border-dashed border-white last:border-b-0 cursor-pointer"
            >
              <button
                className="w-full text-left py-4 flex justify-between items-center focus:outline-none group"
                onClick={() => toggleAccordion(index)}
              >
                <span className="font-default uppercase">{service.title}</span>
                <div className="flex-shrink-0 ml-4 transition-transform duration-300">
                  <PlusMinusToggle isOpen={openIndex === index} />
                </div>
              </button>
              <div 
                ref={el => tabContentRefs.current[index] = el}
                className="overflow-hidden"
              >
                <div className="pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div 
                      ref={el => contentContainerRefs.current[index] = el}
                      className="content-container text-md font-secondary"
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
                    {service.media && (
                      <div className="relative w-full pb-[100%]">
                        <div className="absolute inset-0">
                          {getMediaContent(service)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
