import React, { useRef, useState, useEffect } from 'react';

interface ScrambleTextProps {
  children: React.ReactNode;
  className?: string;
  isActive?: boolean; // External hover control
}

const ScrambleText: React.FC<ScrambleTextProps> = ({ children, className = '', isActive }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const isAnimatingRef = useRef(false);

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

  // Store the original text when it changes - but only when not animating
  useEffect(() => {
    if (!isAnimatingRef.current) {
      // Use children prop as primary source of truth
      if (typeof children === 'string') {
        setOriginalText(children);
      } else if (textRef.current) {
        const text = textRef.current.textContent || '';
        setOriginalText(text);
      }
    }
  }, [children]);

  // Handle external isActive prop changes
  useEffect(() => {
    if (isActive && gsapLoaded && textRef.current && originalText) {
      isAnimatingRef.current = true; // Mark as animating
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
          .to(textRef.current, { 
            duration: 0.05, 
            text: originalText,
            onComplete: () => {
              isAnimatingRef.current = false; // Animation finished
            }
          });
      });
    } else if (!isActive && gsapLoaded && textRef.current && originalText) {
      isAnimatingRef.current = true; // Mark as animating
      // Restore original text when isActive becomes false
      import('gsap').then(({ default: gsap }) => {
        gsap.to(textRef.current, {
          duration: 0.1,
          text: originalText,
          onComplete: () => {
            isAnimatingRef.current = false; // Animation finished
          }
        });
      });
    }
  }, [isActive, gsapLoaded, originalText]);

  // Handle hover effects (for standalone use)
  const handleMouseEnter = () => {
    if (gsapLoaded && textRef.current && originalText) {
      isAnimatingRef.current = true; // Mark as animating
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
          .to(textRef.current, { 
            duration: 0.05, 
            text: originalText,
            onComplete: () => {
              isAnimatingRef.current = false; // Animation finished
            }
          });
      });
    }
  };

  const handleMouseLeave = () => {
    if (gsapLoaded && textRef.current && originalText) {
      isAnimatingRef.current = true; // Mark as animating
      import('gsap').then(({ default: gsap }) => {
        gsap.to(textRef.current, {
          duration: 0.1,
          text: originalText,
          onComplete: () => {
            isAnimatingRef.current = false; // Animation finished
          }
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
