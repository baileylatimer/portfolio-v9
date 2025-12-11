import React, { useRef, useEffect, useState } from 'react';
import { useAsciiMode } from '~/contexts/AsciiModeContext';

// Function to generate a simple placeholder ASCII art animation frame
const generatePlaceholderFrame = (frameNumber: number) => {
  const width = 40;
  const height = 20;
  const chars = '@#8&?+*:,. ';
  
  let result = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create a simple animated pattern
      const angle = (frameNumber / 10) % (2 * Math.PI);
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - width / 2 + Math.cos(angle) * 5, 2) + 
        Math.pow(y - height / 2 + Math.sin(angle) * 5, 2)
      );
      
      const normalizedDistance = Math.min(1, distanceFromCenter / (width / 3));
      const charIndex = Math.floor(normalizedDistance * (chars.length - 1));
      result += chars[charIndex];
    }
    result += '\n';
  }
  
  return result;
};

// Generate a detailed cowboy silhouette with fire ASCII art
const generateCowboyFireAsciiArt = (width: number, height: number, time: number): string => {
  let result = '';
  
  // Create a more detailed cowboy silhouette with fire
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Normalize coordinates to [0,1] range
      const nx = x / width;
      const ny = y / height;
      
      // Create a more detailed cowboy silhouette
      
      // Hat
      const hatBrim = (ny > 0.28 && ny < 0.33 && nx > 0.35 && nx < 0.65);
      const hatTop = (ny > 0.18 && ny < 0.28 && nx > 0.42 && nx < 0.58);
      
      // Face details
      const face = (ny > 0.33 && ny < 0.42 && nx > 0.45 && nx < 0.55);
      const eyes = (ny > 0.35 && ny < 0.37 && ((nx > 0.46 && nx < 0.48) || (nx > 0.52 && nx < 0.54)));
      
      // Body
      const shoulders = (ny > 0.42 && ny < 0.48 && nx > 0.38 && nx < 0.62);
      const torso = (ny > 0.48 && ny < 0.75 && nx > 0.42 && nx < 0.58);
      const arms = (ny > 0.48 && ny < 0.65 && ((nx > 0.32 && nx < 0.42) || (nx > 0.58 && nx < 0.68)));
      
      // Fire effect (more detailed and animated)
      // Left side fire
      const fireLeftBase = (nx > 0.25 && nx < 0.38 && ny > 0.5 && ny < 0.8);
      const fireLeftFlicker = fireLeftBase && (
        Math.sin(ny * 30 + time * 8 + nx * 20) * 0.5 + 0.5 > 0.4 ||
        Math.sin(nx * 25 + time * 6 + ny * 15) * 0.5 + 0.5 > 0.45
      );
      
      // Right side fire (optional)
      const fireRightBase = (nx > 0.62 && nx < 0.75 && ny > 0.5 && ny < 0.8);
      const fireRightFlicker = fireRightBase && (
        Math.sin(ny * 25 + time * 7 + nx * 15) * 0.5 + 0.5 > 0.42 ||
        Math.sin(nx * 20 + time * 5 + ny * 25) * 0.5 + 0.5 > 0.47
      );
      
      // Smoke effect above fire
      const smokeLeft = (nx > 0.2 && nx < 0.4 && ny > 0.2 && ny < 0.5);
      const smokeRight = (nx > 0.6 && nx < 0.8 && ny > 0.2 && ny < 0.5);
      const smokeEffect = (smokeLeft || smokeRight) && (
        Math.sin(ny * 10 + time * 2 + nx * 8) * 0.5 + 0.5 > 0.7
      );
      
      // Background with stars
      const star = Math.sin(nx * 100 + ny * 100) * 0.5 + 0.5 > 0.97;
      
      // Combine all elements with appropriate characters
      if (hatBrim) {
        result += '@'; // Hat brim
      } else if (hatTop) {
        result += '#'; // Hat top
      } else if (eyes) {
        result += '.'; // Eyes
      } else if (face) {
        result += '&'; // Face
      } else if (shoulders || torso) {
        result += '8'; // Body
      } else if (arms) {
        result += '%'; // Arms
      } else if (fireLeftFlicker || fireRightFlicker) {
        // Animated fire with different characters based on height and time
        const fireChars = '*+&%@$';
        const heightFactor = 1.0 - (ny - 0.5) / 0.3; // Higher flames use different chars
        const fireCharIndex = Math.floor(
          (Math.sin(time * 10 + nx * 20 + ny * 15) * 0.5 + 0.5) * 
          fireChars.length * heightFactor
        ) % fireChars.length;
        result += fireChars[fireCharIndex];
      } else if (smokeEffect) {
        // Smoke characters
        const smokeChars = '.:~';
        const smokeCharIndex = Math.floor(
          (Math.sin(time * 3 + nx * 10 + ny * 5) * 0.5 + 0.5) * 
          smokeChars.length
        );
        result += smokeChars[smokeCharIndex];
      } else if (star) {
        result += '+'; // Stars in background
      } else {
        // Background with subtle texture
        const bgNoise = Math.sin(nx * 50 + ny * 30 + time) * 0.5 + 0.5;
        const bgChar = bgNoise > 0.9 ? '.' : ' ';
        result += bgChar;
      }
    }
    result += '\n';
  }
  
  return result;
};

// Generate a simple ASCII art pattern based on time and container dimensions
const generateSimpleAsciiPattern = (width: number, height: number, time: number, containerWidth?: number, containerHeight?: number): string => {
  // For the hero video, use the cowboy silhouette pattern
  if (width > 50 && height > 25) { // Only use for larger ASCII art areas
    return generateCowboyFireAsciiArt(width, height, time);
  }
  
  // For smaller areas, use the original pattern
  const chars = '@#8&?+*:,. ';
  let result = '';
  
  // Use container dimensions to adjust pattern scale if provided
  const scaleX = containerWidth ? containerWidth / 640 : 1;
  const scaleY = containerHeight ? containerHeight / 360 : 1;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create various patterns based on position and time
      // Use container dimensions to scale the patterns
      const pattern1 = Math.sin((x / width * 10 * scaleX) + time) * Math.cos((y / height * 10 * scaleY) + time);
      const pattern2 = Math.sin((x + y) / (10 * Math.min(scaleX, scaleY)) + time) * Math.cos((x - y) / (10 * Math.min(scaleX, scaleY)) - time);
      const pattern3 = Math.sin(Math.sqrt(Math.pow(x - width/2, 2) + Math.pow(y - height/2, 2)) / (5 * Math.min(scaleX, scaleY)) - time);
      
      // Combine patterns
      const value = (pattern1 + pattern2 + pattern3) / 3;
      
      // Map to ASCII character
      const normalizedValue = (value + 1) / 2; // Convert from [-1,1] to [0,1]
      const charIndex = Math.floor(normalizedValue * (chars.length - 1));
      result += chars[charIndex];
    }
    result += '\n';
  }
  
  return result;
};

interface AsciiVideoProps {
  src: string;
  className?: string;
  style?: React.CSSProperties;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
}

const AsciiVideo: React.FC<AsciiVideoProps> = ({ 
  src, 
  className = '',
  style = {},
  autoPlay = true,
  muted = true,
  loop = true,
  playsInline = true
}) => {
  const { asciiMode } = useAsciiMode();
  const videoRef = useRef<HTMLVideoElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // State for animation
  const [frameCount, setFrameCount] = useState(0);
  
  // Effect for ASCII mode
  useEffect(() => {
    if (!asciiMode) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }
    
    console.log('[AsciiVideo] ASCII mode enabled for video, source:', src);
    
    const video = videoRef.current;
    const pre = preRef.current;
    
    if (!video || !pre) {
      console.error('[AsciiVideo] Missing refs:', { 
        video: !!video, 
        pre: !!pre 
      });
      return;
    }
    
    // Set video attributes
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.crossOrigin = 'Anonymous';
    
    // Animation function - generates ASCII art based on time and container dimensions
    const animate = () => {
      setFrameCount(prev => prev + 1);
      
      // Get container dimensions
      const containerWidth = video.videoWidth || 640;
      const containerHeight = video.videoHeight || 360;
      
      console.log('[AsciiVideo] Video state:', {
        readyState: video.readyState,
        paused: video.paused,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        currentTime: video.currentTime,
        duration: video.duration || 0,
        networkState: video.networkState,
        error: video.error ? 'Error: ' + video.error.code : 'No error'
      });
      
      // Calculate ASCII dimensions to maintain aspect ratio
      // We'll use a character width-to-height ratio of approximately 0.5
      // (characters are typically taller than they are wide)
      const charWidthToHeightRatio = 0.5;
      const containerAspectRatio = containerWidth / containerHeight;
      
      // Calculate ASCII dimensions
      let asciiWidth, asciiHeight;
      if (containerWidth > containerHeight) {
        // Landscape orientation
        asciiWidth = Math.min(160, Math.floor(containerWidth / 8)); // Increased resolution
        asciiHeight = Math.floor(asciiWidth / containerAspectRatio / charWidthToHeightRatio);
      } else {
        // Portrait orientation
        asciiHeight = Math.min(80, Math.floor(containerHeight / 8)); // Increased resolution
        asciiWidth = Math.floor(asciiHeight * containerAspectRatio * charWidthToHeightRatio);
      }
      
      console.log('[AsciiVideo] Container dimensions:', containerWidth, 'x', containerHeight);
      console.log('[AsciiVideo] ASCII dimensions:', asciiWidth, 'x', asciiHeight);
      
      // Try to access actual video frame data
      try {
        // Get canvas context
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.error('[AsciiVideo] Failed to get canvas context');
          throw new Error('Canvas context not available');
        }
        
        // Set canvas dimensions
        canvas.width = containerWidth;
        canvas.height = containerHeight;
        
        // Try to draw video frame to canvas
        console.log('[AsciiVideo] Attempting to draw video frame to canvas...');
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          console.log('[AsciiVideo] Successfully drew video frame to canvas');
        } catch (drawError) {
          console.error('[AsciiVideo] Error drawing video to canvas:', drawError);
          throw drawError;
        }
        
        // Try to get image data from canvas
        console.log('[AsciiVideo] Attempting to get image data from canvas...');
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          console.log('[AsciiVideo] Successfully got image data:', 
            imageData.width, 'x', imageData.height, 
            'data length:', imageData.data.length);
          
          // Check if image data contains actual content (not all zeros or all same value)
          const sampleSize = 1000;
          const samples = [];
          for (let i = 0; i < sampleSize; i++) {
            const idx = Math.floor(Math.random() * imageData.data.length / 4) * 4;
            samples.push(imageData.data[idx] + imageData.data[idx+1] + imageData.data[idx+2]);
          }
          const uniqueValues = new Set(samples).size;
          console.log('[AsciiVideo] Image data sample uniqueness:', uniqueValues, 'out of', sampleSize);
          
          if (uniqueValues < 5) {
            console.warn('[AsciiVideo] Image data appears to be mostly uniform - possible empty canvas');
          }
          
          // Convert image data to ASCII
          console.log('[AsciiVideo] Converting image data to ASCII...');
          const chars = '@#8&?+*:,. ';
          let result = '';
          
          for (let y = 0; y < asciiHeight; y++) {
            for (let x = 0; x < asciiWidth; x++) {
              const posX = Math.floor(x * (canvas.width / asciiWidth));
              const posY = Math.floor(y * (canvas.height / asciiHeight));
              const pos = (posY * canvas.width + posX) * 4;
              
              // Calculate brightness (0-255)
              const r = imageData.data[pos];
              const g = imageData.data[pos + 1];
              const b = imageData.data[pos + 2];
              const brightness = (r + g + b) / 3;
              
              // Map brightness to ASCII character
              const charIndex = Math.floor(brightness / 255 * (chars.length - 1));
              result += chars[charIndex];
            }
            result += '\n';
          }
          
          console.log('[AsciiVideo] ASCII conversion complete, length:', result.length);
          console.log('[AsciiVideo] First 100 chars:', result.substring(0, 100));
          
          // Update the pre element with the ASCII art from the actual video frame
          pre.textContent = result;
          
          // Continue animation
          animationRef.current = requestAnimationFrame(animate);
          return; // Exit early since we successfully processed the video frame
        } catch (imageDataError) {
          console.error('[AsciiVideo] Error getting image data:', imageDataError);
          console.error('[AsciiVideo] This is likely a CORS issue - falling back to procedural pattern');
          throw imageDataError;
        }
      } catch (error) {
        console.warn('[AsciiVideo] Failed to process video frame, using procedural pattern instead:', error);
        
        // Generate ASCII art using procedural pattern as fallback
        const asciiArt = generateSimpleAsciiPattern(
          asciiWidth, 
          asciiHeight, 
          frameCount / 30,
          containerWidth,
          containerHeight
        );
        
        // Update the pre element
        pre.textContent = asciiArt;
      }
      
      // Continue animation
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Start animation
    console.log('[AsciiVideo] Starting ASCII animation');
    animationRef.current = requestAnimationFrame(animate);
    
    // Handle video events
    const handlePlay = () => {
      console.log('[AsciiVideo] Video play event triggered');
    };
    
    const handlePause = () => {
      console.log('[AsciiVideo] Video pause event triggered');
    };
    
    const handleLoadedData = () => {
      console.log('[AsciiVideo] Video data loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
      video.play().catch(error => {
        console.error('[AsciiVideo] Error playing video:', error);
      });
    };
    
    // Add event listeners
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadeddata', handleLoadedData);
    
    // Try to load and play the video
    try {
      video.load();
    } catch (error) {
      console.error('[AsciiVideo] Error loading video:', error);
    }
    
    return () => {
      console.log('[AsciiVideo] Cleaning up video event listeners');
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadeddata', handleLoadedData);
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [asciiMode, src, frameCount]);
  
  // Render normal video if ASCII mode is off
  if (!asciiMode) {
    return (
      <video 
        ref={videoRef}
        className={className}
        style={style}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
      >
        <source src={src} type="video/mp4" />
        <track kind="captions" />
      </video>
    );
  }
  
  // Render ASCII art container if ASCII mode is on
  return (
    <div className={`ascii-video-container ${className}`} style={{...style, backgroundColor: 'black'}}>
      <video 
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
      >
        <source src={src} type="video/mp4" />
        <track kind="captions" />
      </video>
      <pre ref={preRef} className="ascii-art" style={{color: '#DCCFBE'}}>
        {generatePlaceholderFrame(0)}
      </pre>
    </div>
  );
};

export default AsciiVideo;
