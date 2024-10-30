import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface PixelizeImageProps {
  src: string;
  alt: string;
  className?: string;
  disableEffect?: boolean;
  inOverlay?: boolean;
  manualTrigger?: boolean;
}

export interface PixelizeImageRef {
  triggerDepixelize: () => void;
}

interface ScrollTriggerInstance {
  kill: () => void;
}

const PixelizeImage = forwardRef<PixelizeImageRef, PixelizeImageProps>(({ 
  src, 
  alt, 
  className, 
  disableEffect = false,
  inOverlay = false,
  manualTrigger = false
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTriggerInstance | null>(null);
  const initializedRef = useRef(false);

  const initializePixelatedState = (img: HTMLImageElement) => {
    if (canvasRef.current && !disableEffect) {
      canvasRef.current.width = img.width;
      canvasRef.current.height = img.height;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const calculatePixelSize = (width: number, height: number) => {
          const totalPixels = 18;
          return Math.sqrt((width * height) / totalPixels);
        };

        const initialPixelSize = calculatePixelSize(img.width, img.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, img.width / initialPixelSize, img.height / initialPixelSize);
        ctx.drawImage(canvasRef.current, 0, 0, img.width / initialPixelSize, img.height / initialPixelSize, 0, 0, img.width, img.height);

        // Always start with canvas visible and image hidden
        canvasRef.current.style.opacity = '1';
        if (imageRef.current) {
          imageRef.current.style.opacity = '0';
        }
        initializedRef.current = true;
      }
    }
  };

  useImperativeHandle(ref, () => ({
    triggerDepixelize: async () => {
      if (canvasRef.current && imageRef.current) {
        const { gsap } = await import('gsap');
        
        const calculatePixelSize = (width: number, height: number) => {
          const totalPixels = 18;
          return Math.sqrt((width * height) / totalPixels);
        };

        const startPixelSize = calculatePixelSize(canvasRef.current.width, canvasRef.current.height);
        const endPixelSize = 1;
        const duration = 0.5;

        gsap.to({}, {
          duration,
          onUpdate: function() {
            const progress = this.progress();
            if (canvasRef.current && imageRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                const currentPixelSize = gsap.utils.interpolate(startPixelSize, endPixelSize, progress);
                ctx.imageSmoothingEnabled = false;
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.drawImage(imageRef.current, 0, 0, canvasRef.current.width / currentPixelSize, canvasRef.current.height / currentPixelSize);
                ctx.drawImage(canvasRef.current, 0, 0, canvasRef.current.width / currentPixelSize, canvasRef.current.height / currentPixelSize, 0, 0, canvasRef.current.width, canvasRef.current.height);
              }
            }
          },
          onComplete: () => {
            if (canvasRef.current && imageRef.current) {
              gsap.to(canvasRef.current, { opacity: 0, duration: 0.2 });
              gsap.to(imageRef.current, { opacity: 1, duration: 0.2 });
            }
          }
        });
      }
    }
  }));

  useEffect(() => {
    if (!isLoaded || initializedRef.current) return;

    if (imageRef.current) {
      initializePixelatedState(imageRef.current);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (disableEffect || manualTrigger) return;

    let gsap: typeof import('gsap').default;
    let ScrollTrigger: typeof import('gsap/ScrollTrigger').default;

    const loadGSAP = async () => {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      gsap = gsapModule.default;
      ScrollTrigger = scrollTriggerModule.default;
      gsap.registerPlugin(ScrollTrigger);

      if (isLoaded && canvasRef.current && imageRef.current && containerRef.current) {
        // Kill previous ScrollTrigger instance if it exists
        if (scrollTriggerRef.current) {
          scrollTriggerRef.current.kill();
        }

        const calculatePixelSize = (width: number, height: number) => {
          const totalPixels = 18;
          return Math.sqrt((width * height) / totalPixels);
        };

        const startPixelSize = calculatePixelSize(canvasRef.current.width, canvasRef.current.height);
        const endPixelSize = 1;

        const depixelize = (progress: number) => {
          if (canvasRef.current && imageRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const currentPixelSize = gsap.utils.interpolate(startPixelSize, endPixelSize, progress);
              ctx.imageSmoothingEnabled = false;
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              ctx.drawImage(imageRef.current, 0, 0, canvasRef.current.width / currentPixelSize, canvasRef.current.height / currentPixelSize);
              ctx.drawImage(canvasRef.current, 0, 0, canvasRef.current.width / currentPixelSize, canvasRef.current.height / currentPixelSize, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        };

        // Check if element is already in view
        const rect = containerRef.current.getBoundingClientRect();
        const isInView = rect.top < window.innerHeight && rect.bottom > 0;

        if (isInView) {
          // If already in view, immediately show the unpixelated image
          depixelize(1);
          gsap.set(canvasRef.current, { opacity: 0 });
          gsap.set(imageRef.current, { opacity: 1 });
        } else {
          // Ensure pixelated state is visible
          if (!initializedRef.current && imageRef.current) {
            initializePixelatedState(imageRef.current);
          }

          // Store the ScrollTrigger instance
          scrollTriggerRef.current = ScrollTrigger.create({
            trigger: containerRef.current,
            start: 'top bottom-=10%',
            end: 'top center+=20%',
            scrub: 0.5,
            onUpdate: (self) => {
              depixelize(self.progress);
            },
            onEnter: () => {
              gsap.to(canvasRef.current, { opacity: 1, duration: 0.1 });
            },
            onLeave: () => {
              gsap.to(canvasRef.current, { opacity: 0, duration: 0.1 });
              gsap.to(imageRef.current, { opacity: 1, duration: 0.1 });
            },
            onEnterBack: () => {
              gsap.to(canvasRef.current, { opacity: 1, duration: 0.1 });
              gsap.to(imageRef.current, { opacity: 0, duration: 0.1 });
            },
            onLeaveBack: () => {
              gsap.to(canvasRef.current, { opacity: 0, duration: 0.1 });
            },
            scroller: inOverlay ? ".overflow-y-auto" : undefined,
          });
        }

        // Force a refresh of ScrollTrigger
        ScrollTrigger.refresh();
      }
    };

    loadGSAP();

    return () => {
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
    };
  }, [isLoaded, src, disableEffect, inOverlay, manualTrigger]);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setIsLoaded(true);
    };
    img.onerror = () => {
      setError('Failed to load image');
    };
  }, [src]);

  if (disableEffect) {
    return (
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
      {error && (
        <div className="absolute inset-0 bg-red-200 flex items-center justify-center text-red-600">
          {error}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onLoad={() => {
          if (imageRef.current && !initializedRef.current) {
            initializePixelatedState(imageRef.current);
          }
        }}
      />
    </div>
  );
});

PixelizeImage.displayName = 'PixelizeImage';

export default PixelizeImage;
