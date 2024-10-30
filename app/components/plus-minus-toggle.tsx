import { useEffect, useRef } from 'react';

interface PlusMinusToggleProps {
  isOpen: boolean;
}

const PlusMinusToggle = ({ isOpen }: PlusMinusToggleProps) => {
  const verticalLineRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const animate = async () => {
      const { gsap } = await import('gsap');
      
      if (verticalLineRef.current) {
        gsap.to(verticalLineRef.current, {
          scaleY: isOpen ? 0 : 1,
          duration: 0.4,
          ease: "power2.inOut",
          transformOrigin: "center"
        });
      }
    };
    
    animate();
  }, [isOpen]);

  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      className="transform transition-transform duration-300"
    >
      {/* Horizontal line */}
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Vertical line */}
      <line
        ref={verticalLineRef}
        x1="12"
        y1="4"
        x2="12"
        y2="20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ transformOrigin: 'center' }}
      />
    </svg>
  );
};

export default PlusMinusToggle;
