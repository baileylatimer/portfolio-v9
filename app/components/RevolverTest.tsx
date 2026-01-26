import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const RevolverTest: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('Loading...');

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 400 / 300, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(400, 300);
    renderer.setClearColor(0x000000, 0.1); // Semi-transparent background
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Load the revolver
    const loader = new GLTFLoader();
    
    loader.load(
      '/models/revolver.glb',
      (gltf) => {
        console.log('✅ Revolver loaded successfully!', gltf);
        setStatus('Loaded! Checking textures...');

        const revolver = gltf.scene;
        
        // Log materials to see what we have
        revolver.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            console.log('Mesh material:', child.material);
            console.log('Material type:', child.material.constructor.name);
            
            // Check if material has textures
            if (child.material instanceof THREE.MeshStandardMaterial) {
              console.log('Has diffuse map:', !!child.material.map);
              console.log('Has normal map:', !!child.material.normalMap);
              console.log('Has metalness map:', !!child.material.metalnessMap);
            }
          }
        });

        // Position and scale the gun
        revolver.position.set(0, 0, 0);
        revolver.scale.set(1, 1, 1);
        
        // Rotate to show at an angle
        revolver.rotation.y = Math.PI * 0.2;
        revolver.rotation.x = -Math.PI * 0.1;

        scene.add(revolver);
        
        // Auto-position camera
        const box = new THREE.Box3().setFromObject(revolver);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(center.x + maxDim, center.y, center.z + maxDim * 1.5);
        camera.lookAt(center);

        setStatus(revolver.children.length > 0 ? '✅ Model loaded successfully!' : '⚠️ Model loaded but seems empty');
      },
      (progress) => {
        console.log('Loading progress:', progress);
        setStatus(`Loading... ${Math.round((progress.loaded / progress.total) * 100)}%`);
      },
      (error) => {
        console.error('❌ Error loading revolver:', error);
        setStatus('❌ Failed to load model');
      }
    );

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="p-4 border border-gray-300 rounded bg-contrast-higher">
      <h3 className="text-lg font-bold mb-2 color-bg">🔫 Revolver Test</h3>
      <p className="text-sm mb-4 color-bg">Status: {status}</p>
      <div 
        ref={mountRef} 
        className="border border-gray-500"
        style={{ width: '400px', height: '300px' }}
      />
      <p className="text-xs mt-2 color-bg opacity-70">
        Check console for detailed material/texture info
      </p>
    </div>
  );
};

export default RevolverTest;