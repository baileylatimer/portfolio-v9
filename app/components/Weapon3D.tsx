import React, { useRef, useEffect, useCallback, useContext } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { useWeapon, WeaponType } from '~/contexts/WeaponContext';
import { BulletHoleContext } from '~/contexts/BulletHoleContext';

// Weapon configurations for 3D models
const WEAPON_3D_CONFIGS = {
  [WeaponType.REVOLVER]: {
    modelPath: '/models/revolver.glb',
    soundPath: '/sounds/colt-shot.wav',
    scale: [0.042, 0.042, 0.042], // Reduced by 70% from 0.14 to 0.042
    position: [0, -0.4, -1.3], // Adjusted position for smaller model
    rotation: [-Math.PI * 0.05, Math.PI * 0.5, 0], // Slight downward tilt, 90° turn for first-person view
    fireRate: 325, // ms between shots
    muzzlePosition: [0, -0.32, -1.45], // Adjusted muzzle position for smaller model
    baseRotation: {
      x: -Math.PI * 0.05,
      y: Math.PI * 1.5, // 270° for proper first-person view
    }
  },
  [WeaponType.SHOTGUN]: {
    modelPath: '/models/shotgun.glb',
    soundPath: '/sounds/shotgun.wav',
    scale: [0.08, 0.08, 0.08], // Even smaller since shotgun model is bigger
    position: [0, -0.3, -1.2], // Slightly higher and closer
    rotation: [-Math.PI * 0.05, Math.PI * 0.5, 0], // Base rotation
    fireRate: 800, // Slower fire rate for shotgun
    muzzlePosition: [0, -0.25, -1.4], // Adjusted muzzle position
    baseRotation: {
      x: -Math.PI * 0.05, // Same downward tilt
      y: Math.PI * 1.5, // 270° rotation - same as revolver, should be behind model
    }
  }
};

const Weapon3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const weaponRef = useRef<THREE.Group>();
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const currentMousePosRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const animationIdRef = useRef<number>();
  const firingIntervalRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement>();
  const isFiringRef = useRef<boolean>(false);
  const currentWeaponTypeRef = useRef<WeaponType | null>(null);
  
  // Recoil animation refs
  const recoilOffsetRef = useRef({ x: 0, y: 0, z: 0 });
  const recoilTargetRef = useRef({ x: 0, y: 0, z: 0 });
  const recoilRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const recoilRotTargetRef = useRef({ x: 0, y: 0, z: 0 });
  
  // Muzzle flash refs
  const muzzleFlashLightRef = useRef<THREE.PointLight>();
  const muzzleFlashSpriteRef = useRef<THREE.Sprite>();
  const muzzleFlashActiveRef = useRef(false);
  
  const { activeWeapon } = useWeapon();
  const { addBulletHole } = useContext(BulletHoleContext) || {};

  // Check if current weapon is a 3D weapon
  const is3DWeapon = activeWeapon === WeaponType.REVOLVER || activeWeapon === WeaponType.SHOTGUN;
  const weaponConfig = WEAPON_3D_CONFIGS[activeWeapon as keyof typeof WEAPON_3D_CONFIGS];

  // Cursor tracking with smooth interpolation
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!is3DWeapon) return;

    // Store current mouse position for bullet holes
    currentMousePosRef.current = { x: event.clientX, y: event.clientY };

    // Convert mouse position to normalized coordinates (-1 to 1)
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = -(event.clientY / window.innerHeight) * 2 + 1; 

    mousePositionRef.current = { x, y };

    // Calculate target rotations with constraints
    targetRotationRef.current.y = -x * Math.PI * 0.2; // Horizontal rotation
    targetRotationRef.current.x = y * Math.PI * 0.08; // Vertical rotation
  }, [is3DWeapon]);

  // Trigger gun recoil animation
  const triggerRecoil = useCallback(() => {
    if (!weaponConfig) return;

    // Different recoil patterns per weapon
    if (activeWeapon === WeaponType.REVOLVER) {
      // MASSIVE kick for old .45 Colt revolver
      recoilTargetRef.current = {
        x: (Math.random() - 0.5) * 0.04,
        y: 0.12, // DRAMATIC upward kick
        z: 0.18 // STRONG kick back
      };
      recoilRotTargetRef.current = {
        x: 0.35 + (Math.random() - 0.5) * 0.08, // MASSIVE barrel rise
        y: (Math.random() - 0.5) * 0.05,
        z: (Math.random() - 0.5) * 0.04
      };
    } else if (activeWeapon === WeaponType.SHOTGUN) {
      // Heavy shotgun recoil
      recoilTargetRef.current = {
        x: (Math.random() - 0.5) * 0.06,
        y: 0.15, // Even more upward kick
        z: 0.22 // MASSIVE kick back
      };
      recoilRotTargetRef.current = {
        x: 0.25 + (Math.random() - 0.5) * 0.06,
        y: (Math.random() - 0.5) * 0.04,
        z: (Math.random() - 0.5) * 0.03
      };
    }

    // Auto-return to zero
    setTimeout(() => {
      recoilTargetRef.current = { x: 0, y: 0, z: 0 };
      recoilRotTargetRef.current = { x: 0, y: 0, z: 0 };
    }, activeWeapon === WeaponType.SHOTGUN ? 200 : 150); // Shotgun takes longer to settle
  }, [activeWeapon, weaponConfig]);

  // Trigger muzzle flash effect
  const triggerMuzzleFlash = useCallback(() => {
    if (!muzzleFlashLightRef.current || !muzzleFlashSpriteRef.current) return;

    muzzleFlashActiveRef.current = true;

    // Flash the light
    muzzleFlashLightRef.current.intensity = activeWeapon === WeaponType.SHOTGUN ? 4.0 : 3.0;
    muzzleFlashLightRef.current.color.setHex(0xff6600);

    // Show the sprite
    muzzleFlashSpriteRef.current.material.opacity = 1.0;
    const flashSize = activeWeapon === WeaponType.SHOTGUN ? 0.4 : 0.3;
    muzzleFlashSpriteRef.current.scale.set(flashSize, flashSize, flashSize);

    // Fade out
    setTimeout(() => {
      muzzleFlashActiveRef.current = false;
    }, activeWeapon === WeaponType.SHOTGUN ? 80 : 60);
  }, [activeWeapon]);

  // Fire a single shot
  const fireSingleShot = useCallback((event?: MouseEvent) => {
    if (!is3DWeapon || !weaponConfig) return;

    // Use provided event position or current mouse position
    const shootPos = event 
      ? { x: event.clientX, y: event.clientY }
      : currentMousePosRef.current;

    console.log(`🔫 ${activeWeapon.toUpperCase()} BANG! Shooting at:`, shootPos);

    // Dispatch shatter event
    const shatterEvent = new CustomEvent('shatter-image', {
      detail: { x: shootPos.x, y: shootPos.y },
      bubbles: true
    });
    document.dispatchEvent(shatterEvent);

    // Create bullet hole
    if (addBulletHole && shootPos.x && shootPos.y) {
      const x = shootPos.x + window.scrollX;
      const y = shootPos.y + window.scrollY;
      addBulletHole(x, y, document.body);
    }

    // Trigger effects
    triggerRecoil();
    triggerMuzzleFlash();

    // Play sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }

    // Screen shake
    document.body.classList.add('screen-shake');
    setTimeout(() => {
      document.body.classList.remove('screen-shake');
    }, 80);
  }, [is3DWeapon, weaponConfig, activeWeapon, addBulletHole, triggerRecoil, triggerMuzzleFlash]);

  // Handle mouse down - start firing
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!is3DWeapon || isFiringRef.current || !weaponConfig) return;

    isFiringRef.current = true;
    fireSingleShot(event);

    // Start interval for continuous firing
    firingIntervalRef.current = window.setInterval(() => {
      if (!is3DWeapon) {
        clearInterval(firingIntervalRef.current!);
        firingIntervalRef.current = undefined;
        isFiringRef.current = false;
        return;
      }
      fireSingleShot();
    }, weaponConfig.fireRate);
  }, [is3DWeapon, weaponConfig, fireSingleShot]);

  // Handle mouse up - stop firing
  const handleMouseUp = useCallback(() => {
    if (firingIntervalRef.current) {
      clearInterval(firingIntervalRef.current);
      firingIntervalRef.current = undefined;
    }
    isFiringRef.current = false;
  }, []);

  // Animation loop
  const animate = useCallback(() => {
    if (!weaponRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      animationIdRef.current = requestAnimationFrame(animate);
      return;
    }

    const lerpFactor = 0.08;
    const isRecoiling = recoilTargetRef.current.x !== 0 || recoilTargetRef.current.y !== 0 || recoilTargetRef.current.z !== 0;
    const recoilLerpFactor = isRecoiling ? 0.4 : 0.12;

    // Update rotations
    currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * lerpFactor;
    currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * lerpFactor;

    // Update recoil
    recoilOffsetRef.current.x += (recoilTargetRef.current.x - recoilOffsetRef.current.x) * recoilLerpFactor;
    recoilOffsetRef.current.y += (recoilTargetRef.current.y - recoilOffsetRef.current.y) * recoilLerpFactor;
    recoilOffsetRef.current.z += (recoilTargetRef.current.z - recoilOffsetRef.current.z) * recoilLerpFactor;

    recoilRotationRef.current.x += (recoilRotTargetRef.current.x - recoilRotationRef.current.x) * recoilLerpFactor;
    recoilRotationRef.current.y += (recoilRotTargetRef.current.y - recoilRotationRef.current.y) * recoilLerpFactor;
    recoilRotationRef.current.z += (recoilRotTargetRef.current.z - recoilRotationRef.current.z) * recoilLerpFactor;

    if (weaponConfig) {
      // Apply position
      weaponRef.current.position.set(
        weaponConfig.position[0] + recoilOffsetRef.current.x,
        weaponConfig.position[1] + recoilOffsetRef.current.y,
        weaponConfig.position[2] + recoilOffsetRef.current.z
      );

      // Apply rotation
      weaponRef.current.rotation.x = weaponConfig.baseRotation.x + currentRotationRef.current.x + recoilRotationRef.current.x;
      weaponRef.current.rotation.y = weaponConfig.baseRotation.y + currentRotationRef.current.y + recoilRotationRef.current.y;
      weaponRef.current.rotation.z = recoilRotationRef.current.z;
    }

    // Update muzzle flash
    if (muzzleFlashLightRef.current && muzzleFlashSpriteRef.current) {
      if (!muzzleFlashActiveRef.current) {
        muzzleFlashLightRef.current.intensity *= 0.85;
        muzzleFlashSpriteRef.current.material.opacity *= 0.85;
        muzzleFlashSpriteRef.current.scale.multiplyScalar(0.95);
      }
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationIdRef.current = requestAnimationFrame(animate);
  }, [weaponConfig]);

  // Load weapon model
  const loadWeapon = useCallback((weaponType: WeaponType) => {
    if (!weaponConfig || !sceneRef.current) return;

    console.log(`🔫 Loading ${weaponType} 3D model...`);

    const loader = new GLTFLoader();
    loader.load(
      weaponConfig.modelPath,
      (gltf) => {
        console.log(`🔫 ${weaponType} loaded!`, gltf);

        // Remove previous weapon
        if (weaponRef.current && sceneRef.current) {
          sceneRef.current.remove(weaponRef.current);
        }

        const weapon = gltf.scene;
        
        // Configure shadows and ENHANCED REFLECTIVE materials for studio look
        weapon.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material instanceof THREE.MeshPhysicalMaterial) {
              // MAXIMUM metallic reflectivity for studio look
              child.material.metalness = 0.95; // Nearly pure metal
              child.material.roughness = 0.05; // Mirror-like surface
              child.material.reflectivity = 1.0; // Maximum reflection
              child.material.clearcoat = 1.0; // Clear coat for extra shine
              child.material.clearcoatRoughness = 0.0; // Perfect clear coat
              child.material.envMapIntensity = 2.0; // Enhanced environment reflections
              child.material.color.setHex(0x666666); // Slightly brighter base color
            } else if (child.material instanceof THREE.MeshStandardMaterial) {
              // Convert standard materials to reflective
              child.material.metalness = 0.9;
              child.material.roughness = 0.1;
              child.material.envMapIntensity = 1.5;
              child.material.color.setHex(0x666666);
            }
          }
        });

        // Apply weapon config
        weapon.position.set(weaponConfig.position[0], weaponConfig.position[1], weaponConfig.position[2]);
        weapon.scale.set(weaponConfig.scale[0], weaponConfig.scale[1], weaponConfig.scale[2]);
        weapon.rotation.set(weaponConfig.rotation[0], weaponConfig.rotation[1], weaponConfig.rotation[2]);

        sceneRef.current!.add(weapon);
        weaponRef.current = weapon;

        // Update muzzle flash position
        if (muzzleFlashLightRef.current) {
          muzzleFlashLightRef.current.position.set(weaponConfig.muzzlePosition[0], weaponConfig.muzzlePosition[1], weaponConfig.muzzlePosition[2]);
        }
        if (muzzleFlashSpriteRef.current) {
          muzzleFlashSpriteRef.current.position.set(
            weaponConfig.muzzlePosition[0],
            weaponConfig.muzzlePosition[1],
            weaponConfig.muzzlePosition[2] + 0.05
          );
        }

        // Update audio
        if (audioRef.current) {
          audioRef.current.src = weaponConfig.soundPath;
          audioRef.current.volume = weaponType === WeaponType.SHOTGUN ? 0.4 : 0.3;
        }

        console.log(`🔫 ${weaponType} ready for action!`);
      },
      (progress) => {
        console.log(`🔫 Loading ${weaponType}...`, Math.round((progress.loaded / progress.total) * 100) + '%');
      },
      (error) => {
        console.error(`🔫 Error loading ${weaponType}:`, error);
      }
    );
  }, [weaponConfig]);

  // Initialize or cleanup 3D scene based on weapon type
  useEffect(() => {
    if (!is3DWeapon) {
      // Cleanup when switching to non-3D weapon
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      return;
    }

    if (!mountRef.current || !weaponConfig) return;

    console.log(`🔫 Initializing ${activeWeapon} 3D scene...`);

    // Initialize scene if not exists
    if (!sceneRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        powerPreference: 'high-performance'
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      mountRef.current.appendChild(renderer.domElement);

      sceneRef.current = scene;
      rendererRef.current = renderer;
      cameraRef.current = camera;

      // ULTIMATE STUDIO LIGHTING - Absolutely brilliant and reflective
      
      // Ambient light - ULTRA MAXIMUM intensity for brilliant overall illumination
      const ambientLight = new THREE.AmbientLight(0xffffff, 3.5);
      scene.add(ambientLight);

      // Hemisphere light - INSANE bright natural sky/ground lighting
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xeeeeee, 2.5);
      scene.add(hemisphereLight);

      // Main directional light - NUCLEAR bright with warm golden tone
      const mainLight = new THREE.DirectionalLight(0xfff2cc, 6.0);
      mainLight.position.set(5, 5, 5);
      mainLight.castShadow = true;
      mainLight.shadow.mapSize.width = 2048;
      mainLight.shadow.mapSize.height = 2048;
      scene.add(mainLight);

      // Front key light - BLAZING illumination from camera direction
      const keyLight = new THREE.DirectionalLight(0xffffff, 4.5);
      keyLight.position.set(0, 2, 3);
      scene.add(keyLight);

      // POWERFUL fill lights from multiple angles
      const leftFillLight = new THREE.DirectionalLight(0xfff8e1, 2.5);
      leftFillLight.position.set(-3, 1, 2);
      scene.add(leftFillLight);

      const rightFillLight = new THREE.DirectionalLight(0xfff8e1, 2.5);
      rightFillLight.position.set(3, 1, 2);
      scene.add(rightFillLight);

      // Top-down studio light for maximum shimmering
      const topLight = new THREE.DirectionalLight(0xffffff, 3.0);
      topLight.position.set(0, 8, 0);
      scene.add(topLight);

      // Bottom-up reflection light for studio effect
      const bottomLight = new THREE.DirectionalLight(0xffffff, 2.0);
      bottomLight.position.set(0, -5, 2);
      scene.add(bottomLight);

      // BACK LIGHTING - Multiple lights to eliminate matte back
      const backLight1 = new THREE.DirectionalLight(0xfff4d6, 3.0);
      backLight1.position.set(0, 0, -5); // Direct back light
      scene.add(backLight1);

      const backLight2 = new THREE.DirectionalLight(0xffeecc, 2.0);
      backLight2.position.set(-2, 1, -4); // Back left
      scene.add(backLight2);

      const backLight3 = new THREE.DirectionalLight(0xffeecc, 2.0);
      backLight3.position.set(2, 1, -4); // Back right
      scene.add(backLight3);

      // Extreme rim lights for dramatic studio shimmer
      const blueRimLight = new THREE.DirectionalLight(0x99aaff, 1.5);
      blueRimLight.position.set(-5, 2, -5);
      scene.add(blueRimLight);

      const goldRimLight = new THREE.DirectionalLight(0xffcc66, 1.5);
      goldRimLight.position.set(5, 2, -5);
      scene.add(goldRimLight);

      // Additional warm studio lights
      const warmLight1 = new THREE.DirectionalLight(0xffd699, 2.0);
      warmLight1.position.set(-4, 4, 1);
      scene.add(warmLight1);

      const warmLight2 = new THREE.DirectionalLight(0xffd699, 2.0);
      warmLight2.position.set(4, 4, 1);
      scene.add(warmLight2);

      // Create muzzle flash effects
      const muzzleLight = new THREE.PointLight(0xff6600, 0, 2);
      muzzleLight.position.set(weaponConfig.muzzlePosition[0], weaponConfig.muzzlePosition[1], weaponConfig.muzzlePosition[2]);
      scene.add(muzzleLight);
      muzzleFlashLightRef.current = muzzleLight;

      // Create muzzle flash sprite
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      
      if (context) {
        const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 0, 1)');
        gradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(200, 0, 0, 0)');
        
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
      sprite.position.set(
        weaponConfig.muzzlePosition[0],
        weaponConfig.muzzlePosition[1],
        weaponConfig.muzzlePosition[2] + 0.05
      );
      sprite.scale.set(0, 0, 0);
      scene.add(sprite);
      muzzleFlashSpriteRef.current = sprite;

      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, -1);

      // Initialize audio
      audioRef.current = new Audio(weaponConfig.soundPath);
      audioRef.current.volume = activeWeapon === WeaponType.SHOTGUN ? 0.4 : 0.3;

      // Event listeners
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp);

      const handleResize = () => {
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = window.innerWidth / window.innerHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        }
      };
      window.addEventListener('resize', handleResize);

      animate();
    }

    // Load weapon if different from current
    if (currentWeaponTypeRef.current !== activeWeapon) {
      loadWeapon(activeWeapon);
      currentWeaponTypeRef.current = activeWeapon;
    }

    // Cleanup function
    return () => {
      console.log(`🔫 Cleaning up ${activeWeapon} scene...`);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      
      if (firingIntervalRef.current) {
        clearInterval(firingIntervalRef.current);
        firingIntervalRef.current = undefined;
      }
      
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (weaponRef.current) {
        weaponRef.current.traverse((child) => {
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

      // Reset refs
      sceneRef.current = undefined;
      rendererRef.current = undefined;
      cameraRef.current = undefined;
      weaponRef.current = undefined;
      currentWeaponTypeRef.current = null;
    };
  }, [is3DWeapon, activeWeapon, weaponConfig, loadWeapon, animate, handleMouseMove, handleMouseDown, handleMouseUp]);

  // Don't render anything if not a 3D weapon
  if (!is3DWeapon) {
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

export default Weapon3D;