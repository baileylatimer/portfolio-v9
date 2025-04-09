import React, { useRef, useState, useEffect } from 'react';

interface ScrambleTextProps {
  children: React.ReactNode;
  className?: string;
}

const ScrambleText: React.FC<ScrambleTextProps> = ({ children, className = '' }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [originalText, setOriginalText] = useState('');

  // Load GSAP and TextPlugin
  useEffect(() => {
    const loadGSAP = async () => {
      const { default: gsap } = await import('gsap');
      const { default: TextPlugin } = await import('gsap/TextPlugin');
      gsap.registerPlugin(TextPlugin);
      setGsapLoaded(true);
    };

    loadGSAP();
  }, []);

  // Store the original text when it changes
  useEffect(() => {
    if (textRef.current) {
      // Get the text content
      const text = textRef.current.textContent || '';
      setOriginalText(text);
    }
  }, [children]);

  // Handle hover effects
  const handleMouseEnter = () => {
    if (gsapLoaded && textRef.current && originalText) {
      import('gsap').then(({ default: gsap }) => {
        // Create a scrambled version of the text using only the original letters
        const letters = originalText.split("");
        const scramble = () => {
          // Shuffle the letters
          for (let i = letters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [letters[i], letters[j]] = [letters[j], letters[i]];
          }
          return letters.join("");
        };
        
        // Create a timeline for the scramble effect
        const tl = gsap.timeline();
        
        // Add multiple scrambles to create the effect (faster)
        tl.to(textRef.current, { duration: 0.05, text: scramble() })
          .to(textRef.current, { duration: 0.05, text: scramble() })
          .to(textRef.current, { duration: 0.05, text: scramble() })
          .to(textRef.current, { duration: 0.05, text: originalText });
      });
    }
  };

  const handleMouseLeave = () => {
    if (gsapLoaded && textRef.current && originalText) {
      import('gsap').then(({ default: gsap }) => {
        gsap.to(textRef.current, {
          duration: 0.1,
          text: originalText
        });
      });
    }
  };

  return (
    <span
      ref={textRef}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </span>
  );
};

export default ScrambleText;
