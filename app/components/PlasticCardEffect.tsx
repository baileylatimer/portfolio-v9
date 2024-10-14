import React, { useRef, useEffect, useState } from 'react';

interface PlasticCardEffectProps {
  children: React.ReactNode;
  className?: string;
}

const PlasticCardEffect: React.FC<PlasticCardEffectProps> = ({ children, className = '' }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const lightingRef = useRef<HTMLDivElement>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);

  useEffect(() => {
    // Dynamically import GSAP and ScrollTrigger
    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;
      import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
        const ScrollTrigger = ScrollTriggerModule.default;
        gsap.registerPlugin(ScrollTrigger);
        setGsapLoaded(true);
      });
    });
  }, []);

  useEffect(() => {
    if (!gsapLoaded || !cardRef.current || !lightingRef.current) return;

    import('gsap').then((gsapModule) => {
      const gsap = gsapModule.default;
      import('gsap/ScrollTrigger').then((ScrollTriggerModule) => {
        const ScrollTrigger = ScrollTriggerModule.default;

        const card = cardRef.current;
        const lighting = lightingRef.current;

        if (!card || !lighting) return;

        // Hover effect
        const updateLighting = (e: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          gsap.to(lighting, {
            duration: 0.3,
            backgroundImage: `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 50%)`,
            ease: 'power2.out'
          });
        };

        card.addEventListener('mousemove', updateLighting);
        card.addEventListener('mouseleave', () => {
          gsap.to(lighting, {
            duration: 0.3,
            backgroundImage: 'none',
            ease: 'power2.out'
          });
        });

        // Scroll effect
        ScrollTrigger.create({
          trigger: card,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            const progress = self.progress;
            gsap.to(lighting, {
              duration: 0.1,
              opacity: 0.1 + progress * 0.2,
              ease: 'none'
            });
          }
        });

        return () => {
          card.removeEventListener('mousemove', updateLighting);
          ScrollTrigger.getAll().forEach(trigger => trigger.kill());
        };
      });
    });
  }, [gsapLoaded]);

  return (
    <div ref={cardRef} className={`plastic-card-effect relative overflow-hidden ${className}`}>
      <div ref={lightingRef} className="absolute inset-0 pointer-events-none z-10"></div>
      {children}
    </div>
  );
};

export default PlasticCardEffect;
