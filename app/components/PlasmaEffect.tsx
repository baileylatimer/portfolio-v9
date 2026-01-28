import React, { useEffect, useState } from 'react';

interface PlasmaEffectProps {
  duration: number;
}

const PlasmaEffect: React.FC<PlasmaEffectProps> = ({ duration }) => {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsActive(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!isActive) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        animation: `plasmaFade ${duration}ms ease-out forwards`,
      }}
    >
      {/* Main plasma particles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={`plasma-${i}`}
          className="absolute"
          style={{
            left: `${40 + Math.random() * 20}%`,
            top: `${40 + Math.random() * 20}%`,
            width: `${8 + Math.random() * 12}px`,
            height: `${8 + Math.random() * 12}px`,
            background: `radial-gradient(circle, 
              rgba(0, 255, 0, 1) 0%, 
              rgba(50, 255, 50, 0.8) 30%, 
              rgba(150, 255, 100, 0.4) 60%,
              transparent 100%)`,
            borderRadius: '50%',
            filter: 'blur(1px)',
            animation: `plasmaParticle ${duration}ms ease-out forwards ${i * 50}ms`,
          }}
        />
      ))}

      {/* Energy sparks */}
      {[...Array(12)].map((_, i) => (
        <div
          key={`spark-${i}`}
          className="absolute"
          style={{
            left: `${30 + Math.random() * 40}%`,
            top: `${30 + Math.random() * 40}%`,
            width: `${2 + Math.random() * 4}px`,
            height: `${10 + Math.random() * 20}px`,
            background: `linear-gradient(${Math.random() * 360}deg, 
              rgba(0, 255, 0, 1) 0%, 
              rgba(100, 255, 50, 0.6) 50%,
              transparent 100%)`,
            borderRadius: '2px',
            filter: 'blur(0.5px)',
            animation: `plasmaSpark ${duration * 0.6}ms ease-out forwards ${i * 30}ms`,
          }}
        />
      ))}

      {/* Central energy burst */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          background: `radial-gradient(circle, 
            rgba(0, 255, 0, 0.9) 0%, 
            rgba(50, 255, 50, 0.6) 20%, 
            rgba(100, 255, 100, 0.3) 40%,
            rgba(150, 255, 150, 0.1) 70%,
            transparent 100%)`,
          borderRadius: '50%',
          filter: 'blur(2px)',
          animation: `plasmaBurst ${duration}ms ease-out forwards`,
        }}
      />

      <style>{`
        @keyframes plasmaFade {
          0% { opacity: 1; }
          70% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        @keyframes plasmaParticle {
          0% { 
            opacity: 1; 
            transform: translate(0, 0) scale(1);
          }
          50% { 
            opacity: 0.8; 
            transform: translate(-20px, -30px) scale(0.8);
          }
          100% { 
            opacity: 0; 
            transform: translate(-40px, -60px) scale(0.2);
          }
        }

        @keyframes plasmaSpark {
          0% { 
            opacity: 1; 
            transform: scale(1) rotate(0deg);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(0.6) rotate(180deg);
          }
          100% { 
            opacity: 0; 
            transform: scale(0.1) rotate(360deg);
          }
        }

        @keyframes plasmaBurst {
          0% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(0.5);
          }
          20% { 
            opacity: 0.9; 
            transform: translate(-50%, -50%) scale(1.2);
          }
          50% { 
            opacity: 0.6; 
            transform: translate(-50%, -50%) scale(1.5);
          }
          100% { 
            opacity: 0; 
            transform: translate(-50%, -50%) scale(2);
          }
        }
      `}</style>
    </div>
  );
};

export default PlasmaEffect;