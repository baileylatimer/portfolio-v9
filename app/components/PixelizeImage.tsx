import React, { useState, useEffect, useRef } from 'react';

interface PixelizeImageProps {
  src: string;
  alt: string;
  className?: string;
  disableEffect?: boolean;
}

const PixelizeImage: React.FC<PixelizeImageProps> = ({ src, alt, className, disableEffect = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disableEffect) return;

    let gsap: typeof import('gsap').default;
    let ScrollTrigger: typeof import('gsap/ScrollTrigger').default;

    const loadGSAP = async () => {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      gsap = gsapModule.default;
      ScrollTrigger = scrollTriggerModule.default;
      gsap.registerPlugin(ScrollTrigger);

      if (isLoaded && canvasRef.current && imageRef.current && containerRef.current) {
        const calculatePixelSize = (width: number, height: number) => {
          const totalPixels = 18; // Target number of pixels
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

        const isMobile = window.innerWidth <= 768; // Adjust this breakpoint as needed

        ScrollTrigger.create({
          trigger: containerRef.current,
          start: isMobile ? 'top bottom-=15%' : 'top bottom-=20%',
          end: isMobile ? 'top center' : 'top center+=20%',
          onUpdate: (self) => {
            depixelize(self.progress);
          },
          onEnter: () => {
            gsap.to(canvasRef.current, { opacity: 1, duration: isMobile ? 0.05 : 0.2 });
          },
          onLeave: () => {
            gsap.to(canvasRef.current, { opacity: 0, duration: isMobile ? 0.05 : 0.2 });
            gsap.to(imageRef.current, { opacity: 1, duration: iMobile ? 0.05 : 0.2 });
          },
          onEnterBack: () => {
            gsap.to(canvasRef.current, { opacity: 1, duration: isMobile ? 0.05 : 0.2 });
            gsap.to(imageRef.current, { opacity: 0, duration: iMobile ? 0.05 : 0.2 });
          },
          onLeaveBack: () => {
            gsap.to(canvasRef.current, { opacity: 0, duration: iMobile ? 0.05 : 0.2 });
          },
        });
      }
    };

    loadGSAP();
  }, [isLoaded, src, disableEffect]);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setIsLoaded(true);
      if (canvasRef.current && imageRef.current && !disableEffect) {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const calculatePixelSize = (width: number, height: number) => {
            const totalPixels = 18; // Target number of pixels
            return Math.sqrt((width * height) / totalPixels);
          };

          const initialPixelSize = calculatePixelSize(img.width, img.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, img.width / initialPixelSize, img.height / initialPixelSize);
          ctx.drawImage(canvasRef.current, 0, 0, img.width / initialPixelSize, img.height / initialPixelSize, 0, 0, img.width, img.height);
        }
      }
    };
    img.onerror = () => {
      setError('Failed to load image');
    };
  }, [src, disableEffect]);

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
        className="w-full h-full object-cover opacity-0"
      />
    </div>
  );
};

export default PixelizeImage;
