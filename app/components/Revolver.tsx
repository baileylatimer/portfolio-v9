import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useShootingMode } from '~/contexts/ShootingModeContext';

const Revolver: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const revolverRef = useRef<THREE.Group>();
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const animationIdRef = useRef<number>();
  
  // Base rotation for proper first-person view
  const BASE_ROTATION_X = -Math.PI * 0.05; // Slight downward tilt
  const BASE_ROTATION_Y = Math.PI * 1.5; // 270° (90° + 180°) for proper first-person view with barrel pointing away
  
  const { isShootingMode } = useShootingMode();

  // Cursor tracking with smooth interpolation
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isShootingMode) return;

    // Convert mouse position to normalized coordinates (-1 to 1)
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1; 

    mousePositionRef.current = { x, y };

    // Calculate target rotations with constraints
    // Horizontal rotation: -35° to +35° (left-right sway) - FIXED: un-inverted controls
    targetRotationRef.current.y = -x * Math.PI * 0.2; // Negated x to fix inverted controls
    
    // Vertical rotation: -15° to +15° (up-down aim)  
    targetRotationRef.current.x = y * Math.PI * 0.08; // 0.08 radians ≈ 4.5°, range ±15°
  }, [isShootingMode]);

  // Animation loop for smooth cursor following
  const animate = useCallback(() => {
    if (!revolverRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      animationIdRef.current = requestAnimationFrame(animate);
      return;
    }

    // Smooth interpolation (lerp) for realistic gun weight
    const lerpFactor = 0.08; // Lower = more lag/weight feeling

    currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * lerpFactor;
    currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * lerpFactor;

    // Apply rotation to the revolver - BASE rotation + cursor movement
    revolverRef.current.rotation.x = BASE_ROTATION_X + currentRotationRef.current.x;
    revolverRef.current.rotation.y = BASE_ROTATION_Y + currentRotationRef.current.y;

    // Render the scene
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    animationIdRef.current = requestAnimationFrame(animate);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current || !isShootingMode) return;

    console.log('🔫 Initializing Revolver 3D scene...');

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true,
      powerPreference: 'high-performance'
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);

    // Store refs
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Lighting setup for realistic gun appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Rim lighting for dramatic effect
    const rimLight = new THREE.DirectionalLight(0x6666ff, 0.3);
    rimLight.position.set(-5, 2, -5);
    scene.add(rimLight);

    // Load the revolver
    const loader = new GLTFLoader();
    loader.load(
      '/models/revolver.glb',
      (gltf) => {
        console.log('🔫 Revolver loaded for shooting mode!', gltf);

        const revolver = gltf.scene;
        
        // Enable shadows
        revolver.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Improve material appearance for gray model
            if (child.material instanceof THREE.MeshPhysicalMaterial) {
              child.material.metalness = 0.7;
              child.material.roughness = 0.3;
              child.material.color.setHex(0x444444); // Dark gray
            }
          }
        });

        // Position for first-person view (centered and properly sized)
        revolver.position.set(0, -0.5, -1.5); // Centered horizontally, down, forward
        revolver.scale.set(0.14, 0.14, 0.14); // 30% smaller for perfect proportions
        
        // Proper first-person rotation - grip toward camera, barrel pointing out
        revolver.rotation.x = -Math.PI * 0.05; // Slight downward aim tilt (smaller for subtle effect)
        revolver.rotation.y = Math.PI * 0.5; // 90° turn for first-person view
        revolver.rotation.z = 0; // Keep it level (no roll)

        scene.add(revolver);
        revolverRef.current = revolver;
        
        console.log('🔫 Revolver ready for action!');
      },
      (progress) => {
        console.log('🔫 Loading revolver...', Math.round((progress.loaded / progress.total) * 100) + '%');
      },
      (error) => {
        console.error('🔫 Error loading revolver:', error);
      }
    );

    // Position camera for first-person view 
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -1);

    // Add mouse move listener
    window.addEventListener('mousemove', handleMouseMove);

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Start animation loop
    animate();

    // Cleanup
    return () => {
      console.log('🔫 Cleaning up Revolver scene...');
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
      
      // Dispose of model materials and geometry
      if (revolverRef.current) {
        revolverRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    };
  }, [isShootingMode, handleMouseMove, animate]);

  // Don't render anything if shooting mode is off
  if (!isShootingMode) {
    return null;
  }

  return (
    <div 
      ref={mountRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1000 }}
    />
  );
};

export default Revolver;