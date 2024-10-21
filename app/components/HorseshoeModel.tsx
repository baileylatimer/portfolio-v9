import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import SvgStar from './svg-star';
import styles from './HorseshoeModel.module.css';

const HorseshoeModel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const baseRotationSpeed = 0.0005; // Keep the slow base rotation speed
  const rotationSpeedRef = useRef<number>(baseRotationSpeed);
  const lastScrollYRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('Initializing 3D scene');

    // Set up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A1917);
    const camera = new THREE.PerspectiveCamera(75, 390 / 547, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(390, 547);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    console.log('Scene set up complete');

    // Set up lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    console.log('Lighting set up complete');

    // Set up scroll-based rotation acceleration
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollYRef.current);
      
      // Accelerate rotation based on scroll speed
      rotationSpeedRef.current = baseRotationSpeed + scrollDelta * 0.0005;
      
      lastScrollYRef.current = currentScrollY;

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set new timeout to reset rotation speed
      scrollTimeoutRef.current = setTimeout(() => {
        rotationSpeedRef.current = baseRotationSpeed;
      }, 200);
    };

    window.addEventListener('scroll', handleScroll);

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
        const scale = 2.5 / maxDim;
        modelRef.current.scale.multiplyScalar(scale);
        
        modelRef.current.position.sub(center.multiplyScalar(scale));
        modelRef.current.position.y += 0.2;
        
        // Position camera to view the entire model
        const distance = 2.0;
        camera.position.set(distance, distance, distance);
        camera.lookAt(0, 0, 0);

        console.log('Model added to scene and scaled');

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          if (modelRef.current) {
            // Apply rotation based on current rotation speed
            modelRef.current.rotation.y += rotationSpeedRef.current;
          }
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
      const width = 390;
      const height = 547;
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
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`${styles.container} horseshoe-wrapper flex items-center justify-center mt-24`}>
      <div ref={containerRef} className="flex-grow" />
      <div className={`${styles.text} ${styles.textOne} font-default`}>INTERNET TRAILBLAZERS</div>
      <div className={`${styles.text} ${styles.textTwo} font-default`}>OBSESSED WITH</div>
      <div className={`${styles.text} ${styles.textThree} font-default`}>YOUR BRANDS MISSION</div>
      <div className={`${styles.text} ${styles.textFour} font-default`}>BUILT IN HOLLYWOOD</div>
      <div className={styles.star}>
        <SvgStar />
      </div>
    </div>
  );
};

export default HorseshoeModel;
