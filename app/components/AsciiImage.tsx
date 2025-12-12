import React, { useEffect, useState } from 'react';
import { useAsciiMode } from '~/contexts/AsciiModeContext';

// Function to generate a simple placeholder ASCII art
const generatePlaceholderAscii = () => {
  const width = 40;
  const height = 20;
  const chars = '@#8&?+*:,. ';
  
  let result = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create a simple pattern
      const distanceFromCenter = Math.sqrt(
        Math.pow(x - width / 2, 2) + 
        Math.pow(y - height / 2, 2)
      );
      
      const normalizedDistance = Math.min(1, distanceFromCenter / (width / 2));
      const charIndex = Math.floor(normalizedDistance * (chars.length - 1));
      result += chars[charIndex];
    }
    result += '\n';
  }
  
  return result;
};

// Generate a procedural ASCII art pattern based on image URL and container dimensions
// This doesn't actually use the image data, but creates a unique pattern based on the URL
const generateProceduralAsciiArt = (src: string, width: number, height: number, containerWidth?: number, containerHeight?: number): string => {
  const chars = '@#8&?+*:,. ';
  let result = '';
  
  // Create a simple hash of the src URL to use as a seed
  let seed = 0;
  for (let i = 0; i < src.length; i++) {
    seed = ((seed << 5) - seed) + src.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }
  
  // Use container dimensions to adjust pattern scale if provided
  const scaleX = containerWidth ? containerWidth / 640 : 1;
  const scaleY = containerHeight ? containerHeight / 360 : 1;
  
  // Use the seed to generate a unique pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Create various patterns based on position and seed
      const pattern1 = Math.sin((x / width * 10 * scaleX) + seed / 1000) * Math.cos((y / height * 10 * scaleY) + seed / 1000);
      const pattern2 = Math.sin((x + y) / (10 * Math.min(scaleX, scaleY)) + seed / 500) * Math.cos((x - y) / (10 * Math.min(scaleX, scaleY)) - seed / 500);
      const pattern3 = Math.sin(Math.sqrt(Math.pow(x - width/2, 2) + Math.pow(y - height/2, 2)) / (5 * Math.min(scaleX, scaleY)) - seed / 2000);
      
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

interface AsciiImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

const AsciiImage: React.FC<AsciiImageProps> = ({ src, alt, className = '', style = {} }) => {
  const { asciiMode } = useAsciiMode();
  const [asciiArt, setAsciiArt] = useState('');
  
  // Generate ASCII art when ASCII mode is enabled
  useEffect(() => {
    if (!asciiMode) return;
    
    console.log('[AsciiImage] ASCII mode enabled, generating art for:', src);
    
    // Get container dimensions from the image element or use defaults
    // We'll use a function to calculate dimensions based on the image URL
    // In a real implementation, we would get the actual image dimensions
    const getImageDimensions = (url: string): { width: number, height: number } => {
      // Extract dimensions from URL if possible (some CDNs include dimensions)
      const match = url.match(/(\d+)x(\d+)/);
      if (match) {
        return { width: parseInt(match[1]), height: parseInt(match[2]) };
      }
      
      // Default dimensions based on common aspect ratios
      if (url.includes('portrait')) {
        return { width: 640, height: 960 };
      } else if (url.includes('square')) {
        return { width: 800, height: 800 };
      } else {
        // Default to landscape
        return { width: 1200, height: 800 };
      }
    };
    
    const dimensions = getImageDimensions(src);
    console.log('[AsciiImage] Estimated image dimensions:', dimensions.width, 'x', dimensions.height);
    
    // Calculate ASCII dimensions to maintain aspect ratio
    const charWidthToHeightRatio = 0.5;
    const containerAspectRatio = dimensions.width / dimensions.height;
    
    // Calculate ASCII dimensions
    let asciiWidth, asciiHeight;
    if (dimensions.width > dimensions.height) {
      // Landscape orientation
      asciiWidth = Math.min(120, Math.floor(dimensions.width / 10));
      asciiHeight = Math.floor(asciiWidth / containerAspectRatio / charWidthToHeightRatio);
    } else {
      // Portrait orientation
      asciiHeight = Math.min(60, Math.floor(dimensions.height / 10));
      asciiWidth = Math.floor(asciiHeight * containerAspectRatio * charWidthToHeightRatio);
    }
    
    console.log('[AsciiImage] ASCII dimensions:', asciiWidth, 'x', asciiHeight);
    
    // Generate procedural ASCII art based on the image URL and dimensions
    const art = generateProceduralAsciiArt(
      src, 
      asciiWidth, 
      asciiHeight, 
      dimensions.width, 
      dimensions.height
    );
    setAsciiArt(art);
    
    console.log('[AsciiImage] ASCII art generated, length:', art.length);
  }, [asciiMode, src]);
  
  if (!asciiMode) {
    return <img src={src} alt={alt} className={className} style={style} />;
  }
  
  // Use the generated ASCII art or a placeholder if not available yet
  const displayArt = asciiArt || generatePlaceholderAscii();
  
  return (
    <div className={`ascii-container ${className}`} style={{...style, backgroundColor: 'black'}}>
      <pre className="ascii-art" style={{color: '#DCCFBE'}}>{displayArt}</pre>
    </div>
  );
};

export default AsciiImage;
