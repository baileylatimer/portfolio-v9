import React, { useRef, useEffect, useCallback, useContext } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useShootingMode } from '~/contexts/ShootingModeContext';
import { BulletHoleContext } from '~/contexts/BulletHoleContext';

const Revolver: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const revolverRef = useRef<THREE.Group>();
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const currentMousePosRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const animationIdRef = useRef<number>();
  const firingIntervalRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement>();
  const isShootingModeRef = useRef<boolean>(false);
  const isFiringRef = useRef<boolean>(false);
  
  // Recoil animation refs
  const recoilOffsetRef = useRef({ x: 0, y: 0, z: 0 });
  const recoilTargetRef = useRef({ x: 0, y: 0, z: 0 });
  const recoilRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const recoilRotTargetRef = useRef({ x: 0, y: 0, z: 0 });
  
  // Muzzle flash refs
  const muzzleFlashLightRef = useRef<THREE.PointLight>();
  const muzzleFlashSpriteRef = useRef<THREE.Sprite>();
  const muzzleFlashActiveRef = useRef(false);
  
  // Base rotation for proper first-person view
  const BASE_ROTATION_X = -Math.PI * 0.05; // Slight downward tilt
  const BASE_ROTATION_Y = Math.PI * 1.5; // 270° (90° + 180°) for proper first-person view with barrel pointing away
  const BASE_POSITION = { x: 0, y: -0.5, z: -1.5 }; // Base gun position
  
  const { isShootingMode } = useShootingMode();
  const { addBulletHole } = useContext(BulletHoleContext) || {};

  // Update refs when state changes
  useEffect(() => {
    isShootingModeRef.current = isShootingMode;
    
    // Clear interval if shooting mode is disabled
    if (!isShootingMode && firingIntervalRef.current) {
      clearInterval(firingIntervalRef.current);
      firingIntervalRef.current = undefined;
      isFiringRef.current = false;
    }
  }, [isShootingMode]);

  // Cursor tracking with smooth interpolation
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isShootingModeRef.current) return;

    // Store current mouse position for bullet holes
    currentMousePosRef.current = { x: event.clientX, y: event.clientY };

    // Convert mouse position to normalized coordinates (-1 to 1)
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1; 

    mousePositionRef.current = { x, y };

    // Calculate target rotations with constraints
    // Horizontal rotation: -35° to +35° (left-right sway) - FIXED: un-inverted controls
    targetRotationRef.current.y = -x * Math.PI * 0.2; // Negated x to fix inverted controls
    
    // Vertical rotation: -15° to +15° (up-down aim)  
    targetRotationRef.current.x = y * Math.PI * 0.08; // 0.08 radians ≈ 4.5°, range ±15°
  }, []);

  // Trigger gun recoil animation
  const triggerRecoil = useCallback(() => {
    // Position recoil: MASSIVE kick for old .45 Colt revolver
    recoilTargetRef.current = {
      x: (Math.random() - 0.5) * 0.04, // Bigger random horizontal kick
      y: 0.12, // DRAMATIC upward kick (old revolver power!)
      z: 0.18 // STRONG kick back toward shooter
    };

    // Rotation recoil: DRAMATIC muzzle rise (old gun has serious kick)
    recoilRotTargetRef.current = {
      x: 0.35 + (Math.random() - 0.5) * 0.08, // MASSIVE barrel rise (~20+ degrees)
      y: (Math.random() - 0.5) * 0.05, // More horizontal rotation
      z: (Math.random() - 0.5) * 0.04 // More barrel roll
    };

    // Auto-return to zero after ~150ms (longer hold at peak)
    setTimeout(() => {
      recoilTargetRef.current = { x: 0, y: 0, z: 0 };
      recoilRotTargetRef.current = { x: 0, y: 0, z: 0 };
    }, 150);
  }, []);

  // Trigger muzzle flash effect
  const triggerMuzzleFlash = useCallback(() => {
    if (!muzzleFlashLightRef.current || !muzzleFlashSpriteRef.current) return;

    muzzleFlashActiveRef.current = true;

    // Flash the light (bright orange burst)
    muzzleFlashLightRef.current.intensity = 3.0;
    muzzleFlashLightRef.current.color.setHex(0xff6600); // Bright orange

    // Show the sprite (muzzle flash graphic)
    muzzleFlashSpriteRef.current.material.opacity = 1.0;
    muzzleFlashSpriteRef.current.scale.set(0.3, 0.3, 0.3);

    // Fade out over ~60ms
    setTimeout(() => {
      muzzleFlashActiveRef.current = false;
    }, 60);
  }, []);

  // Fire a single shot
  const fireSingleShot = useCallback((event?: MouseEvent) => {
    if (!isShootingModeRef.current) return;

    // Use provided event position or current mouse position
    const shootPos = event 
      ? { x: event.clientX, y: event.clientY }
      : currentMousePosRef.current;

    console.log('🔫 BANG! Shooting at:', shootPos);

    // Create bullet hole at cursor position
    if (addBulletHole && shootPos.x && shootPos.y) {
      const x = shootPos.x + window.scrollX;
      const y = shootPos.y + window.scrollY;
      addBulletHole(x, y, document.body);
    }

    // Trigger gun recoil animation
    triggerRecoil();

    // Trigger muzzle flash effect
    triggerMuzzleFlash();

    // Play gunshot sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // Reset to start
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }

    // Trigger screen shake
    document.body.classList.add('screen-shake');
    
    // Remove screen shake class after animation completes
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, 80); // Match animation duration in CSS
  }, [addBulletHole, triggerRecoil]);

  // Handle mouse down - start firing
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!isShootingModeRef.current || isFiringRef.current) return;

    isFiringRef.current = true;

    // Fire immediately
    fireSingleShot(event);

    // Start interval for continuous firing (realistic revolver timing: ~325ms)
    firingIntervalRef.current = window.setInterval(() => {
      if (!isShootingModeRef.current) {
        clearInterval(firingIntervalRef.current!);
        firingIntervalRef.current = undefined;
        isFiringRef.current = false;
        return;
      }
      fireSingleShot();
    }, 325);
  }, [fireSingleShot]);

  // Handle mouse up - stop firing
  const handleMouseUp = useCallback(() => {
    if (firingIntervalRef.current) {
      clearInterval(firingIntervalRef.current);
      firingIntervalRef.current = undefined;
    }
    isFiringRef.current = false;
  }, []);

  // Animation loop for smooth cursor following and recoil
  const animate = useCallback(() => {
    if (!revolverRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      animationIdRef.current = requestAnimationFrame(animate);
      return;
    }

    // Smooth interpolation (lerp) for realistic gun weight
    const lerpFactor = 0.08; // Lower = more lag/weight feeling
    
    // Dynamic recoil lerp: fast snap UP, slow settle DOWN
    const isRecoiling = recoilTargetRef.current.x !== 0 || recoilTargetRef.current.y !== 0 || recoilTargetRef.current.z !== 0;
    const recoilLerpFactor = isRecoiling ? 0.4 : 0.12; // Fast up (0.4), slow down (0.12)

    // Update cursor tracking
    currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * lerpFactor;
    currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * lerpFactor;

    // Update recoil animation (asymmetric spring physics)
    recoilOffsetRef.current.x += (recoilTargetRef.current.x - recoilOffsetRef.current.x) * recoilLerpFactor;
    recoilOffsetRef.current.y += (recoilTargetRef.current.y - recoilOffsetRef.current.y) * recoilLerpFactor;
    recoilOffsetRef.current.z += (recoilTargetRef.current.z - recoilOffsetRef.current.z) * recoilLerpFactor;

    recoilRotationRef.current.x += (recoilRotTargetRef.current.x - recoilRotationRef.current.x) * recoilLerpFactor;
    recoilRotationRef.current.y += (recoilRotTargetRef.current.y - recoilRotationRef.current.y) * recoilLerpFactor;
    recoilRotationRef.current.z += (recoilRotTargetRef.current.z - recoilRotationRef.current.z) * recoilLerpFactor;

    // Apply position: BASE + recoil offset
    revolverRef.current.position.set(
      BASE_POSITION.x + recoilOffsetRef.current.x,
      BASE_POSITION.y + recoilOffsetRef.current.y,
      BASE_POSITION.z + recoilOffsetRef.current.z
    );

    // Apply rotation: BASE + cursor movement + recoil
    revolverRef.current.rotation.x = BASE_ROTATION_X + currentRotationRef.current.x + recoilRotationRef.current.x;
    revolverRef.current.rotation.y = BASE_ROTATION_Y + currentRotationRef.current.y + recoilRotationRef.current.y;
    revolverRef.current.rotation.z = recoilRotationRef.current.z; // Only recoil affects Z rotation

    // Update muzzle flash fade-out animation
    if (muzzleFlashLightRef.current && muzzleFlashSpriteRef.current) {
      if (!muzzleFlashActiveRef.current) {
        // Fade out
        muzzleFlashLightRef.current.intensity *= 0.85; // Fast fade
        muzzleFlashSpriteRef.current.material.opacity *= 0.85;
        muzzleFlashSpriteRef.current.scale.multiplyScalar(0.95); // Shrink as it fades
      }
    }

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

        // Create muzzle flash light (bright orange point light)
        const muzzleLight = new THREE.PointLight(0xff6600, 0, 2); // Orange, intensity 0 (off), distance 2
        muzzleLight.position.set(0, -0.38, -1.65); // At actual barrel tip (further forward)
        scene.add(muzzleLight);
        muzzleFlashLightRef.current = muzzleLight;

        // Create muzzle flash sprite (procedural fire texture)
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Create gradient fire effect
          const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');    // White center
          gradient.addColorStop(0.3, 'rgba(255, 200, 0, 1)');    // Bright yellow
          gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.8)');  // Orange
          gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');        // Red fade out
          
          context.fillStyle = gradient;
          context.fillRect(0, 0, 128, 128);
        }

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture, 
          transparent: true, 
          opacity: 0,
          blending: THREE.AdditiveBlending
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.set(0, -0.38, -1.6); // At barrel tip (slightly closer than light)
        sprite.scale.set(0, 0, 0); // Start hidden
        scene.add(sprite);
        muzzleFlashSpriteRef.current = sprite;
        
        console.log('🔫 Revolver ready for action with muzzle flash!');
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

    // Initialize audio
    audioRef.current = new Audio('/sounds/colt-shot.wav');
    audioRef.current.volume = 0.3; // Adjust volume as needed

    // Add mouse move and mouse down/up listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp); // Stop firing when mouse leaves window

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
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      
      // Clear any firing interval
      if (firingIntervalRef.current) {
        clearInterval(firingIntervalRef.current);
        firingIntervalRef.current = undefined;
      }
      
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
  }, [isShootingMode, animate]);

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