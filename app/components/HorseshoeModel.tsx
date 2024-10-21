import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const HorseshoeModel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const handleScrollRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing 3D scene');

    // Set up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);  // Light gray background
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    console.log('Scene set up complete');

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    console.log('Lighting set up complete');

    // Set up scroll-based rotation
    let lastScrollY = window.scrollY;
    handleScrollRef.current = () => {
      const scrollDirection = window.scrollY > lastScrollY ? 1 : -1;
      if (modelRef.current) {
        modelRef.current.rotation.y += 0.05 * scrollDirection;
      }
      lastScrollY = window.scrollY;
    };

    // Load the model
    const loader = new GLTFLoader();
    console.log('Attempting to load model from: /models/horseshoe/gltf/Steel_Horseshoe.gltf');
    loader.load(
      '/models/horseshoe/gltf/Steel_Horseshoe.gltf',
      (gltf) => {
        console.log('Model loaded successfully', gltf);
        modelRef.current = gltf.scene;
        scene.add(modelRef.current);
        
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(modelRef.current);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;  // Scale to fit within a 2 unit cube
        modelRef.current.scale.multiplyScalar(scale);
        
        modelRef.current.position.sub(center.multiplyScalar(scale));  // Center the model
        
        // Position camera to view the entire model
        const distance = 3;  // Adjust this value to change the camera distance
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, 0, 0);

        console.log('Model added to scene and scaled');

        window.addEventListener('scroll', handleScrollRef.current);

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };
        animate();

        console.log('Animation loop started');
      },
      (progress) => {
        console.log(`Loading model... ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
      },
      (error) => {
        console.error('An error occurred loading the model:', error);
      }
    );

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('Cleaning up 3D scene');
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScrollRef.current);
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '50vh', border: '1px solid #ccc' }} />;
};

export default HorseshoeModel;
