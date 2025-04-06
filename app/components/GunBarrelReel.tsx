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
  order?: number; // Optional order field for sorting
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
// Adjusted based on the actual barrel image
const CHAMBER_POSITIONS = [
  { x: 35, y: -85 },    // Top chamber
  { x: 105, y: 15 },   // Top right chamber
  { x: 20, y: 110 },     // Bottom right chamber
  { x: -94, y: 63 },    // Bottom left chamber
  { x: -85, y: -60 },  // Top left chamber
];

const GunBarrelReel: React.FC<GunBarrelReelProps> = ({ projects }) => {
  // State for barrel rotation
  // Initialize with Chamber 3 (index 3) as active
  const [activeProjectIndex, setActiveProjectIndex] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  
  // To position Chamber 3 (Bottom left) as the rightmost visible chamber,
  // we need to rotate the barrel to the appropriate angle
  // Since the barrel is 40% off-screen to the left, the rightmost visible chamber
  // is actually the top chamber (index 0) when no rotation is applied
  // So we need to rotate by (3 - 0) * 72 = 216 degrees
  const [barrelAngle, setBarrelAngle] = useState(3 * DEGREES_PER_CHAMBER);
  
  // Refs for animation and interaction
  const containerRef = useRef<HTMLDivElement>(null);
  const barrelRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(0);
  // Initialize lastAngleRef to match the initial barrel angle
  const lastAngleRef = useRef(3 * DEGREES_PER_CHAMBER);
  const animationFrameRef = useRef<number | null>(null);
  // Initialize lastChamberIndexRef to match the active project index (3)
  const lastChamberIndexRef = useRef(3);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef(0);
  
  // Responsive handling
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const barrelImage = '/images/BARREL_IMAGE_PNG.png'; // Use the same image for both mobile and desktop
  
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
  
  // Determine which chamber is in the rightmost position (at 3 * DEGREES_PER_CHAMBER = 216 degrees)
  const getRightmostChamber = useCallback((angle: number) => {
    // Normalize angle to 0-360 range
    const normalizedAngle = ((angle % 360) + 360) % 360;
    
    // The rightmost position is at 3 * DEGREES_PER_CHAMBER (216 degrees)
    // We need to find which chamber is closest to this position
    
    // Find the chamber that's closest to the rightmost position
    let minDistance = 360;
    let rightmostChamberIndex = 0;
    
    for (let i = 0; i < CHAMBER_COUNT; i++) {
      const chamberAngle = i * DEGREES_PER_CHAMBER;
      // Calculate the angular distance (accounting for the circular nature)
      let distance = Math.abs(normalizedAngle - chamberAngle);
      if (distance > 180) distance = 360 - distance;
      
      if (distance < minDistance) {
        minDistance = distance;
        rightmostChamberIndex = i;
      }
    }
    
    console.log(`Rightmost chamber at angle ${normalizedAngle}: Chamber ${rightmostChamberIndex}`);
    return rightmostChamberIndex;
  }, []);
  
  // Check if we've crossed a chamber boundary and update active project
  const checkChamberCrossing = useCallback((angle: number) => {
    // Determine which chamber is in the rightmost position
    const rightmostChamberIndex = getRightmostChamber(angle);
    
    // If the rightmost chamber has changed, play click sound and update active project
    if (rightmostChamberIndex !== lastChamberIndexRef.current) {
      playClickSound();
      setActiveProjectIndex(rightmostChamberIndex);
      lastChamberIndexRef.current = rightmostChamberIndex;
      
      console.log(`Active project updated to Chamber ${rightmostChamberIndex} (rightmost position)`);
    }
  }, [playClickSound, getRightmostChamber]);
  
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
          
          // Determine which chamber is in the rightmost position
          const rightmostChamberIndex = getRightmostChamber(snapTo);
          
          console.log(`Snap animation complete: Setting active project to rightmost chamber ${rightmostChamberIndex}`);
          
          setActiveProjectIndex(rightmostChamberIndex);
          lastChamberIndexRef.current = rightmostChamberIndex;
        }
      };
      
      // Start snap animation
      animationFrameRef.current = requestAnimationFrame(snapAnimation);
      return;
    }
    
    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(animateBarrel);
  }, [checkChamberCrossing, getRightmostChamber]);
  
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
    
    // After the inertia animation completes, determine which chamber is in the rightmost position
    const handleInertiaComplete = () => {
      console.log('Inertia animation complete');
      
      // Determine which chamber is in the rightmost position
      const rightmostChamberIndex = getRightmostChamber(lastAngleRef.current);
      
      console.log(`Rightmost chamber after inertia: Chamber ${rightmostChamberIndex}`);
      
      // Set the active project to the one in the rightmost position
      setActiveProjectIndex(rightmostChamberIndex);
      lastChamberIndexRef.current = rightmostChamberIndex;
    };
    
    // Set a timeout to ensure the inertia animation has a chance to complete
    setTimeout(handleInertiaComplete, 1000);
  }, [isDragging, getRightmostChamber, animateBarrel]);
  
  // Sort projects by order field and limit to 5 projects maximum
  const featuredProjects = [...projects]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .slice(0, CHAMBER_COUNT);
  
  // Log projects for debugging
  useEffect(() => {
    console.log('===== DEBUGGING LOGS =====');
    console.log('Projects after sorting:');
    featuredProjects.forEach((project, index) => {
      // Get the chamber position description
      const chamberPosition = index === 0 ? 'Top' : 
                             index === 1 ? 'Top right' :
                             index === 2 ? 'Bottom right' :
                             index === 3 ? 'Bottom left' :
                             'Top left';
      
      console.log(`Chamber ${index} (${chamberPosition}): ${project.title} (order: ${project.order || 'undefined'})`);
    });
    
    // Log the initial active project and its position
    console.log(`Initial active project: Chamber ${activeProjectIndex} (${
      activeProjectIndex === 0 ? 'Top' : 
      activeProjectIndex === 1 ? 'Top right' :
      activeProjectIndex === 2 ? 'Bottom right' :
      activeProjectIndex === 3 ? 'Bottom left' :
      'Top left'
    })`);
    
    // Log the initial barrel angle
    console.log(`Initial barrel angle: ${barrelAngle} degrees`);
    
    // Log the chamber positions
    console.log('Chamber positions:');
    CHAMBER_POSITIONS.forEach((pos, index) => {
      console.log(`Chamber ${index}: x=${pos.x}, y=${pos.y}`);
    });
    
    // Log the expected navigation order
    console.log('Expected navigation order:');
    console.log('From Chamber 3 (Bottom left) -> Next should be Chamber 4 (Top left)');
    console.log('From Chamber 3 (Bottom left) -> Previous should be Chamber 2 (Bottom right)');
    console.log('===== END DEBUGGING LOGS =====');
  }, [featuredProjects, activeProjectIndex, barrelAngle]);
  
  return (
    <div className="relative w-full overflow-hidden ">
      <div className="container mx-auto px-4 absolute  top-12 md:top-1/3">
        {/* Project title and info section - positioned on the right */}
        <div className="flex flex-col items-end md:items-center  text-right md:text-center mb-8 ml-auto w-1/2">
          <h2 className="text-5xl md:text-8xl uppercase font-bold mb-4 display-text color-contrast-higher">
            {featuredProjects[activeProjectIndex]?.title || 'Featured Project'}
          </h2>
          

        </div>
      </div>

                {/* Navigation controls */}
          <div className="container mx-auto px-4 absolute bottom-12 right-8 md:right-96 md:bottom-1/3 z-50">
            <div className="flex items-end justify-end space-x-8">
              <button 
                className="text-2xl"
                onClick={() => {
                  console.log('===== PREVIOUS BUTTON CLICKED =====');
                  console.log(`Current active project: Chamber ${activeProjectIndex}`);
                  
                  // Go to previous project (counter-clockwise)
                  // From Chamber 3 (Bottom left) we want to go to Chamber 2 (Bottom right)
                  const newIndex = (activeProjectIndex - 1 + CHAMBER_COUNT) % CHAMBER_COUNT;
                  console.log(`New index calculation: (${activeProjectIndex} - 1 + ${CHAMBER_COUNT}) % ${CHAMBER_COUNT} = ${newIndex}`);
                  
                  // Calculate the corresponding barrel angle
                  // We need to rotate the barrel clockwise
                  // In CSS transform: rotate(), positive angles rotate clockwise
                  // So to rotate clockwise, we need to increase the angle
                  const newAngle = barrelAngle + DEGREES_PER_CHAMBER;
                  console.log(`New angle calculation: ${barrelAngle} + ${DEGREES_PER_CHAMBER} = ${newAngle}`);
                  console.log(`IMPORTANT: Increasing angle should rotate clockwise in CSS transform`);
                  
                  // Log the expected chamber position
                  const chamberPosition = newIndex === 0 ? 'Top' : 
                                         newIndex === 1 ? 'Top right' :
                                         newIndex === 2 ? 'Bottom right' :
                                         newIndex === 3 ? 'Bottom left' :
                                         'Top left';
                  console.log(`Expected new active project: Chamber ${newIndex} (${chamberPosition})`);
                  
                  setActiveProjectIndex(newIndex);
                  setBarrelAngle(newAngle);
                  lastAngleRef.current = newAngle;
                  lastChamberIndexRef.current = newIndex;
                  playClickSound();
                }}
              >
                ←
              </button>
              <button 
                className="text-2xl"
                onClick={() => {
                  console.log('===== NEXT BUTTON CLICKED =====');
                  console.log(`Current active project: Chamber ${activeProjectIndex}`);
                  
                  // Go to next project (counter-clockwise)
                  // From Chamber 3 (Bottom left) we want to go to Chamber 4 (Top left)
                  const newIndex = (activeProjectIndex + 1) % CHAMBER_COUNT;
                  console.log(`New index calculation: (${activeProjectIndex} + 1) % ${CHAMBER_COUNT} = ${newIndex}`);
                  
                  // Calculate the corresponding barrel angle
                  // We need to rotate the barrel counter-clockwise
                  // In CSS transform: rotate(), positive angles rotate clockwise
                  // So to rotate counter-clockwise, we need to decrease the angle
                  const newAngle = barrelAngle - DEGREES_PER_CHAMBER;
                  console.log(`New angle calculation: ${barrelAngle} - ${DEGREES_PER_CHAMBER} = ${newAngle}`);
                  console.log(`IMPORTANT: Decreasing angle should rotate counter-clockwise in CSS transform`);
                  
                  // Log the expected chamber position
                  const chamberPosition = newIndex === 0 ? 'Top' : 
                                         newIndex === 1 ? 'Top right' :
                                         newIndex === 2 ? 'Bottom right' :
                                         newIndex === 3 ? 'Bottom left' :
                                         'Top left';
                  console.log(`Expected new active project: Chamber ${newIndex} (${chamberPosition})`);
                  
                  setActiveProjectIndex(newIndex);
                  setBarrelAngle(newAngle);
                  lastAngleRef.current = newAngle;
                  lastChamberIndexRef.current = newIndex;
                  playClickSound();
                }}
              >
                →
              </button>
              <a 
                href={`/work`}
                className="px-6 py-2 border border-black uppercase text-sm tracking-wider hover:bg-black hover:text-white transition-colors"
              >
                VIEW ALL
              </a>
            </div>
          </div>
      
      {/* Gun barrel container - positioned to the left with 40% off-screen */}
      <div 
        ref={containerRef}
        className="relative"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ 
          touchAction: 'none',
          height: isMobile ? '580px' : '1100px',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Rotating barrel */}
        <div 
          ref={barrelRef}
          className="absolute h-full"
          style={{ 
            transform: `rotate(${barrelAngle}deg)`,
            transformOrigin: 'center center', // Rotate around the center
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            width: '100%',
            left: '-40%', // Position 40% off-screen to the left
            scale: isMobile ? '1.6' : '1' // Scale down on mobile
          }}
        >
          {/* Barrel image */}
          <img 
            src={barrelImage}
            alt="Gun Barrel"
            className="w-full h-full object-contain"
          />
          
          {/* Project images in chambers - scaled up for the larger barrel */}
          {featuredProjects.map((project, index) => {
            // Scale factor based on the barrel size
            const scaleFactor = isMobile ? 1 : 2.5;
            const imageSize = 70 * scaleFactor;
            const halfImageSize = imageSize / 2;
            
            return (
              <div
                key={project._id}
                className="absolute rounded-full overflow-hidden"
                style={{
                  width: `${imageSize}px`,
                  height: `${imageSize}px`,
                  left: `calc(50% + ${CHAMBER_POSITIONS[index].x * scaleFactor}px - ${halfImageSize}px)`,
                  top: `calc(50% + ${CHAMBER_POSITIONS[index].y * scaleFactor}px - ${halfImageSize}px)`,
                  transform: `rotate(${-barrelAngle}deg)`, // Counter-rotate to keep upright
                  transformOrigin: 'center center'
                }}
              >
                {/* Project image - apply sepia filter to non-active projects */}
                <img
                  src={project.mainImage.asset.url}
                  alt={project.title}
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{
                    filter: index === activeProjectIndex ? 'none' : 'sepia(0.7) brightness(0.8)',
                  }}
                />
                
                {/* Glass overlay */}
                <img
                  src="/images/CHAMBER_GLASS.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{ zIndex: 10 }}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Dotted border around the section */}
      <div className="absolute inset-0 border-2 border-dashed border-black m-8 z-n-1 pointer-events-none"></div>
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
