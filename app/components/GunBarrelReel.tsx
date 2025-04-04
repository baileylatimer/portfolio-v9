import { useEffect, useRef, useState, useCallback } from 'react';

// Define the project type based on Sanity schema
interface FeaturedProject {
  _id: string;
  title: string;
  slug: { current: string };
  mainImage: {
    asset: {
      url: string;
    };
  };
  featured: boolean;
}

interface GunBarrelReelProps {
  projects: FeaturedProject[];
}

// Constants for the gun barrel
const CHAMBER_COUNT = 5;
const DEGREES_PER_CHAMBER = 360 / CHAMBER_COUNT; // 72 degrees
const FRICTION = 0.95; // Friction factor (0-1): higher = less friction
const VELOCITY_THRESHOLD = 0.1; // Velocity below which we snap to nearest chamber
const SNAP_DURATION = 300; // Duration of snap animation in ms

// Chamber positions (x, y coordinates relative to the center of the barrel)
// These would need to be adjusted based on the actual barrel image
const CHAMBER_POSITIONS = [
  { x: 0, y: -120 },    // Top chamber
  { x: 114, y: -37 },   // Top right chamber
  { x: 70, y: 100 },    // Bottom right chamber
  { x: -70, y: 100 },   // Bottom left chamber
  { x: -114, y: -37 },  // Top left chamber
];

const GunBarrelReel: React.FC<GunBarrelReelProps> = ({ projects }) => {
  // State for barrel rotation
  const [barrelAngle, setBarrelAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  
  // Refs for animation and interaction
  const containerRef = useRef<HTMLDivElement>(null);
  const barrelRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(0);
  const lastAngleRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastChamberIndexRef = useRef(0);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef(0);
  
  // Responsive handling
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const barrelImage = isMobile ? '/images/BARREL_IMAGE_MOBILE' : '/images/BARREL_IMAGE_PNG.png';
  
  // Initialize audio
  useEffect(() => {
    clickSoundRef.current = new Audio('/sounds/GUN_CLICK_SOUND.wav');
    clickSoundRef.current.preload = 'auto';
    
    return () => {
      // Clean up animation frame on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Calculate the center point of the barrel for rotation calculations
  const getBarrelCenter = useCallback(() => {
    if (!barrelRef.current) return { x: 0, y: 0 };
    
    const rect = barrelRef.current.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }, []);
  
  // Calculate angle from pointer position relative to barrel center
  const getAngleFromPointer = useCallback((pointerX: number, pointerY: number) => {
    const center = getBarrelCenter();
    const deltaX = pointerX - center.x;
    const deltaY = pointerY - center.y;
    
    // Calculate angle in radians, then convert to degrees
    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
    
    // Convert to 0-360 range
    if (angle < 0) angle += 360;
    
    return angle;
  }, [getBarrelCenter]);
  
  // Play gun click sound when crossing chamber boundaries
  const playClickSound = useCallback(() => {
    if (!clickSoundRef.current) return;
    
    // Clone the audio element to allow multiple concurrent plays
    const sound = clickSoundRef.current.cloneNode() as HTMLAudioElement;
    sound.volume = 0.7; // Slightly reduce volume
    sound.play().catch(err => console.error('Error playing click sound:', err));
    
    // Clean up cloned audio elements after they finish playing
    sound.onended = () => {
      sound.remove();
    };
  }, []);
  
  // Check if we've crossed a chamber boundary and update active project
  const checkChamberCrossing = useCallback((angle: number) => {
    // Normalize angle to 0-360 range
    const normalizedAngle = ((angle % 360) + 360) % 360;
    
    // Calculate current chamber index (0-4)
    const chamberIndex = Math.floor(normalizedAngle / DEGREES_PER_CHAMBER) % CHAMBER_COUNT;
    
    // If we've crossed to a new chamber, play click sound and update active project
    if (chamberIndex !== lastChamberIndexRef.current) {
      playClickSound();
      setActiveProjectIndex(chamberIndex);
      lastChamberIndexRef.current = chamberIndex;
    }
  }, [playClickSound]);
  
  // Animation loop for inertia effect
  const animateBarrel = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }
    
    // Apply friction to velocity
    velocityRef.current *= FRICTION;
    
    // Update barrel angle based on velocity
    const newAngle = lastAngleRef.current + velocityRef.current;
    setBarrelAngle(newAngle);
    lastAngleRef.current = newAngle;
    
    // Check if we've crossed a chamber boundary
    checkChamberCrossing(newAngle);
    
    // If velocity is below threshold, snap to nearest chamber
    if (Math.abs(velocityRef.current) < VELOCITY_THRESHOLD) {
      // Calculate nearest chamber angle
      const normalizedAngle = ((newAngle % 360) + 360) % 360;
      const nearestChamberIndex = Math.round(normalizedAngle / DEGREES_PER_CHAMBER) % CHAMBER_COUNT;
      const targetAngle = nearestChamberIndex * DEGREES_PER_CHAMBER;
      
      // Calculate how many full rotations we've done
      const fullRotations = Math.floor(newAngle / 360) * 360;
      
      // Add full rotations to target angle to avoid spinning backwards
      const finalAngle = fullRotations + targetAngle;
      
      // Animate snapping to nearest chamber
      const snapStart = timestamp;
      const snapFrom = newAngle;
      const snapTo = finalAngle;
      
      const snapAnimation = (snapTimestamp: number) => {
        const elapsed = snapTimestamp - snapStart;
        const progress = Math.min(elapsed / SNAP_DURATION, 1);
        
        // Ease out cubic function for smooth deceleration
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        
        const currentAngle = snapFrom + (snapTo - snapFrom) * easeOutCubic;
        setBarrelAngle(currentAngle);
        lastAngleRef.current = currentAngle;
        
        // Check if we've crossed a chamber during snapping
        checkChamberCrossing(currentAngle);
        
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(snapAnimation);
        } else {
          // Ensure we end exactly at the target angle
          setBarrelAngle(snapTo);
          lastAngleRef.current = snapTo;
          setActiveProjectIndex(nearestChamberIndex);
        }
      };
      
      // Start snap animation
      animationFrameRef.current = requestAnimationFrame(snapAnimation);
      return;
    }
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(animateBarrel);
  }, [checkChamberCrossing]);
  
  // Handle pointer down event
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Prevent text selection during drag
    e.preventDefault();
    
    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setIsDragging(true);
    
    // Store initial position
    lastPositionRef.current = { x: e.clientX, y: e.clientY };
    
    // Reset velocity and start time
    velocityRef.current = 0;
    startTimeRef.current = 0;
    
    // Capture pointer to receive events outside the element
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }
  }, []);
  
  // Handle pointer move event
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    // Calculate angles
    const prevAngle = getAngleFromPointer(lastPositionRef.current.x, lastPositionRef.current.y);
    const currentAngle = getAngleFromPointer(e.clientX, e.clientY);
    
    // Calculate the shortest angular distance (handling the 0/360 boundary)
    let deltaAngle = currentAngle - prevAngle;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;
    
    // Update barrel angle
    const newAngle = lastAngleRef.current + deltaAngle;
    setBarrelAngle(newAngle);
    lastAngleRef.current = newAngle;
    
    // Update velocity based on movement
    velocityRef.current = deltaAngle * 0.8; // Adjust multiplier to control sensitivity
    
    // Check if we've crossed a chamber boundary
    checkChamberCrossing(newAngle);
    
    // Update last position
    lastPositionRef.current = { x: e.clientX, y: e.clientY };
  }, [isDragging, getAngleFromPointer, checkChamberCrossing]);
  
  // Handle pointer up event
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Release pointer capture
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    
    // Start inertia animation
    animationFrameRef.current = requestAnimationFrame(animateBarrel);
  }, [isDragging, animateBarrel]);
  
  // Limit to 5 projects maximum
  const featuredProjects = projects.slice(0, CHAMBER_COUNT);
  
  return (
    <div className="relative w-full max-w-2xl mx-auto my-12">
      {/* Active project title display */}
      <div className="text-center mb-4">
        <h2 className="text-3xl uppercase font-bold">
          {featuredProjects[activeProjectIndex]?.title || 'Featured Project'}
        </h2>
      </div>
      
      {/* Gun barrel container */}
      <div 
        ref={containerRef}
        className="relative w-full aspect-square max-w-md mx-auto"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }} // Prevent browser handling of touch gestures
      >
        {/* Rotating barrel */}
        <div 
          ref={barrelRef}
          className="absolute inset-0 w-full h-full"
          style={{ 
            transform: `rotate(${barrelAngle}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* Barrel image */}
          <img 
            src={barrelImage}
            alt="Gun Barrel"
            className="w-full h-full object-contain"
          />
          
          {/* Project images in chambers */}
          {featuredProjects.map((project, index) => (
            <div
              key={project._id}
              className="absolute rounded-full overflow-hidden"
              style={{
                width: '80px',
                height: '80px',
                left: `calc(50% + ${CHAMBER_POSITIONS[index].x}px - 40px)`,
                top: `calc(50% + ${CHAMBER_POSITIONS[index].y}px - 40px)`,
              }}
            >
              <img
                src={project.mainImage.asset.url}
                alt={project.title}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigation controls */}
      <div className="flex justify-center items-center mt-6 space-x-8">
        <button 
          className="text-2xl"
          onClick={() => {
            const newIndex = (activeProjectIndex - 1 + CHAMBER_COUNT) % CHAMBER_COUNT;
            setActiveProjectIndex(newIndex);
            setBarrelAngle(newIndex * DEGREES_PER_CHAMBER);
            lastAngleRef.current = newIndex * DEGREES_PER_CHAMBER;
            lastChamberIndexRef.current = newIndex;
            playClickSound();
          }}
        >
          ←
        </button>
        <a 
          href={`/work/${featuredProjects[activeProjectIndex]?.slug.current}`}
          className="px-6 py-2 border border-black uppercase text-sm tracking-wider hover:bg-black hover:text-white transition-colors"
        >
          VIEW ALL
        </a>
        <button 
          className="text-2xl"
          onClick={() => {
            const newIndex = (activeProjectIndex + 1) % CHAMBER_COUNT;
            setActiveProjectIndex(newIndex);
            setBarrelAngle(newIndex * DEGREES_PER_CHAMBER);
            lastAngleRef.current = newIndex * DEGREES_PER_CHAMBER;
            lastChamberIndexRef.current = newIndex;
            playClickSound();
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};

export default GunBarrelReel;

// Helper hook for media queries
function useMediaQuery(query: { maxWidth: number }) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${query.maxWidth}px)`);
    setMatches(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query.maxWidth]);
  
  return matches;
}
